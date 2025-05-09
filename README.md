# fastrtc-client
Client Side Javascript library for FastRTC Server

## `fastrtc-client.js` Overview

`fastrtc-client.js` is a JavaScript library that provides a client-side interface for interacting with the FastRTC server. This library simplifies WebRTC-based audio streaming and communication with additional features like input/output analysis, error handling, and event callbacks.

### Features:
- **WebRTC Management**: Establishes and manages WebRTC connections.
- **Audio Visualization**: Provides real-time audio level and frequency visualization.
- **Error Handling**: Customizable error callbacks for better debugging.
- **Event Callbacks**: Allows setting custom callbacks for various connection states and events.
- **Input/Output Handling**: Supports additional input and output streams.

### Functions and Usage:
1. **Setup**:
   ```html
   <script src="https://cdn.jsdelivr.net/gh/lalanikarim/fastrtc-client/fastrtc-client.js"></script>
   ```
2. **Initialization**:
   ```javascript
   const rtcClient = new FastRTCClient({
       offer_url: "/webrtc/offer",
       additional_inputs_url: "/input_hook",
       additional_outputs_url: "/outputs",
       rtc_config: { iceServers: [] },
       audioOutput: document.querySelector("audio"),
       enable_output_analyzer: true,
       debug: false,
   });
   ```

3. **Starting the Connection**:
   ```javascript
   rtcClient.start();
   ```

4. **Stopping the Connection**:
   ```javascript
   rtcClient.stop();
   ```

5. **Setting Callbacks**:
   - Example: Callback when connected
     ```javascript
     rtcClient.onConnected(() => {
         console.log("Connected successfully!");
     });
     ```

6. **Audio Level Monitoring**:
   - Input Audio Level:
     ```javascript
     const level = rtcClient.getInputAudioLevel();
     console.log("Input Audio Level:", level);
     ```

7. **Visualization Callbacks**:
   - Example: Update Visualization:
     ```javascript
     rtcClient.setUpdateVisualizationCallback(() => {
         console.log("Update visualization triggered!");
     });
     ```

### Available Callbacks:

The FastRTC client provides several callback functions to handle different events:

1. **Connection State Callbacks**:
   - `onConnecting(callback)`: Called when the WebRTC connection is in the connecting state
   - `onConnected(callback)`: Called when the WebRTC connection is established
   - `onReadyToConnect(callback)`: Called when the client is ready to establish a connection

2. **Data Handling Callbacks**:
   - `getAdditionalInputs(callback)`: Called when the server requests additional inputs
   - `onAdditionalOutputs(callback)`: Called when additional outputs are received from the server
   - `onPauseDetectedReceived(callback)`: Called when a pause is detected in the audio stream
   - `onResponseStarting(callback)`: Called when the server starts sending a response
   - `onErrorReceived(callback)`: Called when an error is received from the server

3. **UI Feedback Callbacks**:
   - `setShowErrorCallback(callback)`: Sets a callback to display errors to the user
   - `setClearErrorCallback(callback)`: Sets a callback to clear displayed errors
   - `setUpdateAudioLevelCallback(callback)`: Called to update the audio level visualization
   - `setUpdateVisualizationCallback(callback)`: Called to update audio visualization (frequency data)

### Utility Methods:

1. **Audio Analysis**:
   - `getInputAudioLevel()`: Returns the current input audio level (0-1)
   - `getDataArrayOutput()`: Returns frequency data for output audio visualization

2. **Session Management**:
   - `getWebRTCId()`: Returns the current WebRTC session ID

### Example Application:
```javascript
const rtcClient = new FastRTCClient();

// Set up connection state callbacks
rtcClient.onReadyToConnect(() => console.log("Ready to connect"));
rtcClient.onConnecting(() => console.log("Connecting..."));
rtcClient.onConnected(() => console.log("Connected successfully!"));

// Set up error handling
rtcClient.setShowErrorCallback((error) => {
    document.getElementById("error-display").textContent = error;
    document.getElementById("error-display").style.display = "block";
});
rtcClient.setClearErrorCallback(() => {
    document.getElementById("error-display").style.display = "none";
});

// Set up audio visualization
rtcClient.setUpdateAudioLevelCallback(() => {
    // Update audio level visualization every 100ms
    setInterval(() => {
        const level = rtcClient.getInputAudioLevel();
        document.getElementById("audio-level").style.width = `${level * 100}%`;
    }, 100);
});

// Handle server events
rtcClient.onPauseDetectedReceived(() => console.log("Pause detected"));
rtcClient.onResponseStarting(() => console.log("Response starting"));
rtcClient.onErrorReceived((message) => console.error("Server error:", message));

// Start the connection
rtcClient.start();
```

### Example Application - FastRTC Echo Server:

#### server.py

```python
# /// script
# requires-python = ">=3.11"
# dependencies = [
#     "fastapi",
#     "fastrtc[stt,tts,vad]",
#     "uvicorn",
# ]
# ///
from fastrtc import Stream, ReplyOnPause
from fastapi import FastAPI
from fastapi.responses import HTMLResponse


def echo(audio):
    yield audio


stream = Stream(
    handler=ReplyOnPause(echo),
    modality="audio",
    mode="send-receive")

app = FastAPI()
stream.mount(app)


@app.get("/")
async def _():
    return HTMLResponse(content=open("index.html").read())


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server:app")

```

#### index.html

```html
<html>

<head>
  <title>FastRTC Client Demo</title>
  <script src="https://cdn.jsdelivr.net/gh/lalanikarim/fastrtc-client@v0.1.2/fastrtc-client.js"></script>
</head>

<body>
  <h1>FastRTC Echo Server</h1>
  <button id="start">Connect</button>
  <button id="stop" style="display: none">Disconnect</button>
  <h3>Logs</h3>
  <pre class="logs"></pre>
  <audio></audio>
  <script defer>
    let logs = document.querySelector("pre")
    let startButton = document.querySelector("button#start")
    let stopButton = document.querySelector("button#stop")
    let client = FastRTCClient({
      additional_outputs_url: null
    })
    client.onConnecting(() => {
      logs.innerText += "Connecting to server.\n"
      startButton.style.display = "none"
      stopButton.style.display = "block"
    })
    client.onConnected(() => {
      logs.innerText += "Connected to server.\n"
    })
    client.onReadyToConnect(() => {
      logs.innerText += "Not connected to server.\n"
      startButton.style.display = "block"
      stopButton.style.display = "none"
    })
    client.onErrorReceived((error) => {
      logs.innerText += `serverError received: ${error}\n`
    })
    client.onPauseDetectedReceived(() => {
      logs.innerText += `pause detected event received. response will start now.\n`
    })
    client.onResponseStarting(() => {
      logs.innerText += `response starting event received. audio will start playing now.\n`
    })
    client.setShowErrorCallback((error) => {
      logs.innerText += `showError received: ${error}\n`
    })
    startButton.addEventListener("click", () => client.start())
    stopButton.addEventListener("click", () => client.stop())
  </script>
</body>

</html>
```
