# Hand Motion Runner

A 3D endless runner inspired by Subway Surfers. It uses a webcam and MediaPipe
hand tracking for lane, jump, and slide controls, with Three.js rendering.

## Run

Serve the repository over HTTP (camera access requires a secure context or
`localhost`):

```sh
python3 -m http.server 4173
```

Open `http://localhost:4173`.