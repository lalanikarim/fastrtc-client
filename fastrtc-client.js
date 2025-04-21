function FastRTCClient(
  {
    offer_url = "/webrtc/offer",
    additional_inputs_url = "/input_hook",
    additional_outputs_url = "/outputs",
    rtc_config = {},
    enable_output_analyzer = true,
    debug = false,
  } = {},
) {
  let pc;
  let webrtc_id;
  const callbacks = {};
  let audioContext;
  let analyser_input, analyser_output;
  let dataArray_input, dataArray_output;

  function setCallback(key, callback) {
    if (typeof callback === "function") {
      callbacks[key] = callback;
    } else {
      if (debug) {
        console.error(`"${key}" is not a function`);
      }
    }
  }
  function onConnecting(callback) {
    setCallback("connecting", callback);
  }
  function onConnected(callback) {
    setCallback("connected", callback);
  }
  function onReadyToConnect(callback) {
    setCallback("readyToConnect", callback);
  }
  function getAdditionalInputs(callback) {
    setCallback("additionalInputs", callback);
  }
  function onPauseDetectedReceived(callback) {
    setCallback("pauseDetectedReceived", callback);
  }
  function onResponseStarting(callback) {
    setCallback("responseStarting", callback);
  }
  function onErrorReceived(callback) {
    setCallback("errorReceived", callback);
  }
  function onAdditionalOutputs(callback) {
    setCallback("additionalOutputs", callback);
  }
  function setShowErrorCallback(callback) {
    setCallback("showError", callback);
  }
  function setClearErrorCallback(callback) {
    setCallback("clearError", callback);
  }
  function setUpdateAudioLevelCallback(callback) {
    setCallback("updateAudioLevel", callback);
  }
  function setUpdateVisualizationCallback(callback) {
    setCallback("updateVisualization", callback);
  }
  function callCallback(key, ...args) {
    const callback = callbacks[key];
    if (callback) {
      return callback(...args);
    } else {
      console.warn(`No callback found for "${key}".`);
    }
  }

  function showError(error) {
    if (callbacks("showError")) {
      callCallback("showError", error);
      if (callbacks("clearError")) {
        setTimeout(() => {
          callCallback("clearError");
        }, 5000);
      }
    }
  }
  function checkConnectionState() {
    if (
      pc &&
      (pc.connectionState === "connecting" ||
        pc.connectionState === "new")
    ) {
      callCallback("connecting");
    } else if (
      pc && pc.connectionState === "connected"
    ) {
      callCallback("connected");
    } else {
      callCallback("readyToConnect");
    }
  }

  async function start() {
    const __RTC_CONFIGURATION__ = {
      sdpSemantics: "unified-plan",
    };
    const config = { ...__RTC_CONFIGURATION__, ...rtc_config };
    pc = new RTCPeerConnection(config);
    const timeoutId = setTimeout(() => {
      showError(
        "Connection is taking longer than usual. Are you on a VPN?",
      );
    }, 5000);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      // Set up input visualization
      audioContext = new AudioContext();
      analyser_input = audioContext.createAnalyser();
      const inputSource = audioContext.createMediaStreamSource(stream);
      inputSource.connect(analyser_input);
      analyser_input.fftSize = 64;
      dataArray_input = new Uint8Array(analyser_input.frequencyBinCount);

      if (callbacks["updateAudioLevel"]) {
        callCallback("updateAudioLevel");
      }

      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // Add connection state change listener
      pc.addEventListener("connectionstatechange", () => {
        console.log("Connection state:", pc.connectionState);
        clearTimeout(timeoutId);
        checkConnectionState();
      });

      // Handle incoming audio
      pc.addEventListener("track", (evt) => {
        if (audioOutput.srcObject !== evt.streams[0]) {
          audioOutput.srcObject = evt.streams[0];
          audioOutput.play();

          if (enable_output_analyzer && callbacks["updateVisualization"]) {
            analyser_output = audioContext.createAnalyser();
            const outputSource = audioContext.createMediaStreamSource(
              evt.streams[0],
            );
            outputSource.connect(analyser_output);
            analyser_output.fftSize = 2048;
            dataArray_output = new Uint8Array(
              analyser_output.frequencyBinCount,
            );
            callCallback("updateVisualization");
          }
        }
      });

      // Create data channel for messages
      const dataChannel = pc.createDataChannel("text");
      dataChannel.onmessage = (event) => {
        const eventJson = JSON.parse(event.data);

        if (eventJson.type === "error") {
          callCallback("errorReceived", eventJson.message);
        } else if (eventJson.type === "send_input") {
          if (additional_inputs_url) {
            const additional_inputs = {
              webrtc_id: webrtc_id,
            };
            let more_inputs = {};
            if (callbacks["additionalInputs"]) {
              more_inputs = callCallback("additionalInputs");
            }
            fetch(additional_inputs_url, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ ...additional_inputs, ...more_inputs }),
            });
          }
        } else if (eventJson.type === "log") {
          if (eventJson.data === "pause_detected") {
            callCallback("pauseDetectedReceived");
          } else if (eventJson.data === "response_starting") {
            callCallback("responseStarting");
          }
        }
      };

      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await new Promise((resolve) => {
        if (pc.iceGatheringState === "complete") {
          resolve();
        } else {
          const checkState = () => {
            if (pc.iceGatheringState === "complete") {
              pc.removeEventListener(
                "icegatheringstatechange",
                checkState,
              );
              resolve();
            }
          };
          pc.addEventListener(
            "icegatheringstatechange",
            checkState,
          );
        }
      });

      webrtc_id = Math.random().toString(36).substring(7);

      const response = await fetch(offer_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sdp: pc.localDescription.sdp,
          type: pc.localDescription.type,
          webrtc_id: webrtc_id,
        }),
      });

      const serverResponse = await response.json();

      if (serverResponse.status === "failed") {
        showError(
          serverResponse.meta.error === "concurrency_limit_reached"
            ? `Too many connections. Maximum limit is ${serverResponse.meta.limit}`
            : serverResponse.meta.error,
        );
        stop();
        return;
      }

      await pc.setRemoteDescription(serverResponse);

      if (enable_output_analyzer && callbacks["updateVisualization"]) {
        callCallback("updateVisualization");
      }

      // create event stream to receive messages from /output
      const eventSource = new EventSource(
        `${additional_outputs_url}?webrtc_id=${webrtc_id}`,
      );
      eventSource.addEventListener("message", (event) => {
        callCallback("additionalOutputs", event);
      });
    } catch (err) {
      clearTimeout(timeoutId);
      console.error("Error setting up WebRTC:", err);
      showError(
        "Failed to establish connection. Please try again.",
      );
      stop();
    }
  }
  function stop() {
    if (pc) {
      if (pc.getTransceivers) {
        pc.getTransceivers().forEach((transceiver) => {
          if (transceiver.stop) {
            transceiver.stop();
          }
        });
      }

      if (pc.getSenders) {
        pc.getSenders().forEach((sender) => {
          if (sender.track && sender.track.stop) sender.track.stop();
        });
      }

      pc.close();
    }

    checkConnectionState();
  }
  function getInputAudioLevel() {
    analyser_input.getByteFrequencyData(dataArray_input);
    const average = Array.from(dataArray_input).reduce((a, b) => a + b, 0) /
      dataArray_input.length;
    return average / 255;
  }
  function getDataArrayOutput() {
    analyser_output.getByteFrequencyData(dataArray_output);
    return dataArray_output;
  }
  function getWebRTCId() {
    return webrtc_id;
  }

  return {
    start,
    stop,
    setShowErrorCallback,
    setClearErrorCallback,
    onConnected,
    onConnecting,
    onErrorReceived,
    onReadyToConnect,
    onResponseStarting,
    onAdditionalOutputs,
    onPauseDetectedReceived,
    getAdditionalInputs,
    getInputAudioLevel,
    setUpdateAudioLevelCallback,
    setUpdateVisualizationCallback,
    getDataArrayOutput,
    getWebRTCId,
  };
}
