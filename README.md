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
1. **Initialization**:
   ```javascript
   const rtcClient = new FastRTCClient({
       offer_url: "/webrtc/offer",
       additional_inputs_url: "/input_hook",
       additional_outputs_url: "/outputs",
       rtc_config: { iceServers: [] },
       enable_output_analyzer: true,
       debug: false,
   });
   ```

2. **Starting the Connection**:
   ```javascript
   rtcClient.start();
   ```

3. **Stopping the Connection**:
   ```javascript
   rtcClient.stop();
   ```

4. **Setting Callbacks**:
   - Example: Callback when connected
     ```javascript
     rtcClient.onConnected(() => {
         console.log("Connected successfully!");
     });
     ```

5. **Audio Level Monitoring**:
   - Input Audio Level:
     ```javascript
     const level = rtcClient.getInputAudioLevel();
     console.log("Input Audio Level:", level);
     ```

6. **Visualization Callbacks**:
   - Example: Update Visualization:
     ```javascript
     rtcClient.setUpdateVisualizationCallback(() => {
         console.log("Update visualization triggered!");
     });
     ```

### Example Application:
```javascript
const rtcClient = new FastRTCClient();

rtcClient.onConnected(() => console.log("Connected"));
rtcClient.start();
```
