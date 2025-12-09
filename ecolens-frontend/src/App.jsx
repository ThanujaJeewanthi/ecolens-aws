import { useState } from 'react';
import './App.css'; // Keep standard CSS for now

// 👇 REPLACE THIS WITH YOUR ACTUAL API GATEWAY URL! 👇
const API_ENDPOINT = 'https://jjhk6ajj52.execute-api.us-east-1.amazonaws.com/Prod/hello/'; 

function App() {
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // 1. Convert File Object to Base64 String (Required by the Lambda)
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result.split(',')[1]); // Only send the data part
      reader.onerror = error => reject(error);
    });
  };

  // 2. Handle File Selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setResult(null);
      setError('');
    }
  };

  // 3. Handle API Submission
  const handleSubmit = async () => {
    if (!imageFile) {
      setError("Please select an image file first.");
      return;
    }
    
    setLoading(true);
    setResult(null);
    setError('');

    try {
      // Get the Base64 string
      const base64Image = await fileToBase64(imageFile);

      // Send POST request to the Lambda API
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ base64Image }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || "API call failed with status " + response.status);
      }

      setResult(data);

    } catch (err) {
      console.error("Submission Error:", err);
      setError(`AI Analysis Failed: ${err.message}. Check browser console for details.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <h1>EcoLens: AI Waste Sorter</h1>
      <p>Upload a photo of waste, and our AI will suggest the proper disposal method.</p>
      
      {/* Input Section */}
      <div className="card">
        <input type="file" accept="image/*" onChange={handleFileChange} />
        {imageFile && <p>Selected: **{imageFile.name}** ({Math.round(imageFile.size / 1024)} KB)</p>}
        
        <button onClick={handleSubmit} disabled={loading || !imageFile}>
          {loading ? 'Analyzing...' : 'Analyze Image with AWS Rekognition'}
        </button>
      </div>
      
      {/* Display Results and Errors */}
      {error && <p className="error-message" style={{color: 'red'}}>**Error:** {error}</p>}

      {result && result.labels && (
        <div className="results-box">
          <h2>AI Results</h2>
          <p>
            The AI detected {result.labels.length} labels with high confidence.
          </p>
          
          <div style={{marginTop: '10px', padding: '10px', border: '1px solid green'}}>
            {result.labels.map((label, index) => (
              <p key={index}>
                **{label.Name}** (Confidence: {label.Confidence}%)
              </p>
            ))}
            
            {/* Simple Mock Decision Logic */}
            {result.labels.some(l => l.Name.toLowerCase().includes('bottle') || l.Name.toLowerCase().includes('can')) ? (
                 <h3 style={{color: 'lightblue'}}> Recommendation: RECYCLE !</h3>
            ) : (
                 <h3 style={{color: 'lightcoral'}}>Recommendation: LANDFILL/COMPOST !</h3>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;