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
