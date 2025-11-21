import React from 'react';

function App() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Research Tutor</h1>
      <p>Backend: {import.meta.env.VITE_API_URL}</p>
      <p>Frontend is running!</p>
    </div>
  );
}

export default App;
