import React, { useEffect, useRef, useState } from 'react';
import './VideoChat.css';

const VideoChat = ({ isCaller, onEndCall, remoteUserId }) => {
  const localVideoRef = useRef();
  const remoteVideoRef = useRef();
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const peerConnection = useRef(null);
  const localStream = useRef(null);

  useEffect(() => {
    initializeMedia();
    return () => {
      if (localStream.current) {
        localStream.current.getTracks().forEach(track => track.stop());
      }
      if (peerConnection.current) {
        peerConnection.current.close();
      }
    };
  }, []);

  const initializeMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      localStream.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      initializePeerConnection();
    } catch (error) {
      console.error('Error accessing media devices:', error);
    }
  };

  const initializePeerConnection = () => {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };

    peerConnection.current = new RTCPeerConnection(configuration);

    // Add local stream to peer connection
    localStream.current.getTracks().forEach(track => {
      peerConnection.current.addTrack(track, localStream.current);
    });

    // Handle incoming stream
    peerConnection.current.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    // Handle ICE candidates
    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        // Send the candidate to the remote peer through your signaling server
        // This would need to be implemented based on your backend
      }
    };
  };

  const toggleVideo = () => {
    if (localStream.current) {
      const videoTrack = localStream.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStream.current) {
      const audioTrack = localStream.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsAudioEnabled(audioTrack.enabled);
      }
    }
  };

  return (
    <div className="video-chat-container">
      <div className="video-grid">
        <div className="video-wrapper">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="local-video"
          />
          <div className="video-label">You</div>
        </div>
        <div className="video-wrapper">
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="remote-video"
          />
          <div className="video-label">Remote User</div>
        </div>
      </div>
      <div className="video-controls">
        <button onClick={toggleVideo} className={`control-btn ${!isVideoEnabled ? 'disabled' : ''}`}>
          {isVideoEnabled ? '🎥' : '🚫'}
        </button>
        <button onClick={toggleAudio} className={`control-btn ${!isAudioEnabled ? 'disabled' : ''}`}>
          {isAudioEnabled ? '🎤' : '🔇'}
        </button>
        <button onClick={onEndCall} className="control-btn end-call">
          ❌
        </button>
      </div>
    </div>
  );
};

export default VideoChat; 