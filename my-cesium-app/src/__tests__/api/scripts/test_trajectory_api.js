import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Example TLE data (using ISS TLE data as an example)
const tleData = {
  tle_line1: '1 25544U 98067A   23001.21653935  .00010578  00000+0  19225-3 0  9990',
  tle_line2: '2 25544  51.6400 339.3767 0006096 286.1300  99.8063 15.49640727376958',
  time_interval: 30
};

async function testAPI() {
  try {
    const response = await fetch('http://localhost:8000/trajectory/from-tle', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tleData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // Save the raw response to a file with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const responseFile = path.join(__dirname, '../responses', `trajectory_response_${timestamp}.json`);
    fs.writeFileSync(responseFile, JSON.stringify(data, null, 2));
    console.log(`Response saved to ${responseFile}`);
    
    // Log the start and end times specifically
    console.log('\nStart time:', data.start_time);
    console.log('End time:', data.end_time);
    
    // Log the first and last trajectory points
    console.log('\nFirst trajectory point:', data.points[0]);
    console.log('Last trajectory point:', data.points[data.points.length - 1]);
  } catch (error) {
    console.error('Error:', error);
  }
}

testAPI(); 