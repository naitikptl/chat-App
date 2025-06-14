import React, { useEffect, useRef, useState } from 'react';
import './VoiceChat.css';

const VoiceChat = ({ isCaller, onEndCall, remoteUserId }) => {
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
        audio: true,
        video: false
      });
      localStream.current = stream;
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
      const remoteAudio = new Audio();
      remoteAudio.srcObject = event.streams[0];
      remoteAudio.play();
    };

    // Handle ICE candidates
    peerConnection.current.onicecandidate = (event) => {
      if (event.candidate) {
        // Send the candidate to the remote peer through your signaling server
        // This would need to be implemented based on your backend
      }
    };
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
    <div className="voice-chat-container">
      <div className="voice-call-status">
        <div className="voice-wave-animation"></div>
        <p>Voice Call in Progress</p>
      </div>
      <div className="voice-controls">
        <button 
          onClick={toggleAudio} 
          className={`control-btn ${!isAudioEnabled ? 'disabled' : ''}`}
        >
          {isAudioEnabled ? '🎤' : '🔇'}
        </button>
        <button onClick={onEndCall} className="control-btn end-call">
          ❌
        </button>
      </div>
    </div>
  );
};

export default VoiceChat; 