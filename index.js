const express = require('express');
const mqtt = require('mqtt');
// const { MongoClient } = require('mongodb');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
const mqttBrokerUrl = 'mqtts://cfb2b6afd6964117af879a0b7d570659.s1.eu.hivemq.cloud';
const mqttUsername = 'Dattt';
const mqttPassword = 'Dat123456';
const mqttTopic = 'cq21/nhom3/led';
const sensorTopic = 'cq21/nhom3/sensor';

// MongoDB connection URI
const mongoURI = 'mongodb://localhost:27017/sensorData'; // Update with your MongoDB URI

app.use((req, res, next) => {
  // Add your CORS headers here
});

const mqttClient = mqtt.connect(mqttBrokerUrl, {
  username: mqttUsername,
  password: mqttPassword
});

let sensorData = { temper: 0, humid: 0, state: false };

// MongoDB client
const mongoClient = new MongoClient(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });

mongoClient.connect()
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch(err => console.error('Error connecting to MongoDB:', err));

mqttClient.on('connect', () => {
  console.log('Connected to MQTT broker');
  mqttClient.subscribe([mqttTopic, sensorTopic], (err) => {
    if (err) {
      console.error('Error subscribing to topic:', err);
    } else {
      console.log('Subscribed to topics');
    }
  });
});

mqttClient.on('message', (topic, message) => {
  if (topic === sensorTopic) {
    const payload = message.toString();
    console.log('Received sensor data:', payload);

    const tempMatch = payload.match(/Temperature: ([\d.]+) °C/);
    const humidMatch = payload.match(/Humidity: ([\d.]+) %/);

    if (tempMatch && humidMatch) {
      sensorData.temper = parseFloat(tempMatch[1]);
      sensorData.humid = parseFloat(humidMatch[1]);
      
      // Save sensor data to MongoDB
      saveSensorDataToMongoDB(sensorData);
    }
  } else if (topic === mqttTopic) {
    console.log('Received control message:', message.toString());
    sensorData.state = message.toString() === '1';
  }
});

app.get('/', (req, res) => {
  res.send('Express server is running');
});

app.post('/control/:id', (req, res) => {
  const { id } = req.params;
  mqttClient.publish(mqttTopic, id);
  res.send(`${id == 1 ? 'On' : 'Off'}`);
});

app.get('/sensor', (req, res) => {
  res.json(sensorData);
});

app.get('/mongoDB/getAll/sensorData', async (req, res) => {
  try {
    const db = mongoClient.db();
    console.log("addsada")
    const collection = db.collection('sensor_data');
    console.log(collection)

    const sensorData = await collection.find().toArray();
    console.log(sensorData);
    res.json(sensorData);
  } catch (err) {
    console.error('Error getting sensor data from MongoDB:', err);
    res.status(500).send('Error getting sensor data from MongoDB');
  }
});



app.listen(8000, () => {
  console.log('Server is running on port 8000');
});
async function saveSensorDataToMongoDB(data) {
  try {
    const db = mongoClient.db();
    const collection = db.collection('sensor_data');

    // Generate a unique _id for each document
    const sensorDataWithId = { ...data, _id: new ObjectId() }; // Sử dụng ObjectId() từ thư viện mongodb

    // Update existing document if _id already exists, otherwise insert new document
    const filter = { _id: sensorDataWithId._id };
    const options = { upsert: true }; // Create a new document if it doesn't exist
    const result = await collection.updateOne(filter, { $set: sensorDataWithId }, options);

    console.log('Sensor data saved to MongoDB:', result.upsertedId || sensorDataWithId._id);
  } catch (err) {
    console.error('Error saving sensor data to MongoDB:', err);
  }
}