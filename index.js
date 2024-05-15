const express = require('express');
const mqtt = require('mqtt');
const { MongoClient } = require('mongodb');

const app = express();
const mqttBrokerUrl = 'mqtts://cfb2b6afd6964117af879a0b7d570659.s1.eu.hivemq.cloud';
const mqttUsername = 'Dattt';
const mqttPassword = 'Dat123456';
const mqttTopic = 'cq21/nhom3/led';
const sensorTopic = 'cq21/nhom3/sensor';
const sensorBh1750 = 'cq21/nhom3/bh1750';

// MongoDB setup
const mongoUrl = 'mongodb://localhost:27017';
const dbName = 'sensorData';
const client = new MongoClient(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });

let sensorData = { temperature: 0, humidity: 0, state: false };

async function connectMongo() {
  await client.connect();
  console.log('Connected to MongoDB');
  const db = client.db(dbName);
  return db.collection('DHT11');
}

let sensorDataCollection;

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

const mqttClient = mqtt.connect(mqttBrokerUrl, {
  username: mqttUsername,
  password: mqttPassword,
});

mqttClient.on('connect', () => {
  console.log('Connected to MQTT broker');
  mqttClient.subscribe([mqttTopic, sensorTopic, sensorBh1750], (err) => {
    if (err) {
      console.error('Error subscribing to topics:', err);
    } else {
      console.log('Subscribed to topics');
    }
  });
});

mqttClient.on('message', async (topic, message) => {
  console.log('Received message from topic:', topic);
  console.log('Message:', message.toString());

  if (topic === sensorTopic || topic === sensorBh1750) {
    const payload = message.toString();
    const [tempPart, humidPart] = payload.split(',');
    let temperature, humidity;
    let light;
    // Check if it's the sensorBH1750 topic
    if (topic === sensorBh1750) {
      light = parseFloat(humidPart.split(':')[1]); // Temperature is humidity in BH1750 sensor
      sensorData.light = light;
      sensorData.humidity = 0;
      sensorData.temperature = 0;
    } else {
      temperature = parseFloat(tempPart.split(':')[1]);
      humidity = parseFloat(humidPart.split(':')[1]);
      sensorData.temperature = temperature;
      sensorData.humidity = humidity;
      sensorData.light = 0;
    }

    console.log(`Updated sensor data: ${JSON.stringify(sensorData)}`);

    // Save to MongoDB
    if (sensorDataCollection) {
      let collectionName = 'DHT11'; // Default collection name
      if (topic === sensorBh1750) {
        collectionName = 'bh1750'; // Change collection name for BH1750 sensor
      }
      try {
        await sensorDataCollection.insertOne({
          temperature,
          humidity,
          light,
          timestamp: new Date(),
        });
        console.log(`Sensor data saved to MongoDB in collection ${collectionName}`);
      } catch (err) {
        console.error(`Error saving sensor data to MongoDB in collection ${collectionName}:`, err);
      }
    }
  }
});

app.get('/', (req, res) => {
  res.send('Express server is running');
});

app.get('/sensor', (req, res) => {
  res.json(sensorData);
});

app.get('/mongoDB/getAll/DHT11', async (req, res) => {
  const data = await sensorDataCollection.find({}).toArray();
  res.json(data);
});

app.post('/control/:id', (req, res) => {
  const { id } = req.params;
  let message;
  switch (id) {
    case 'on1':
      message = 'on1';
      break;
    case 'off1':
      message = 'off1';
      break;
    case 'on2':
      message = 'on2';
      break;
    case 'off2':
      message = 'off2';
      break;
    default:
      res.status(400).send('Invalid command');
      return;
  }
  mqttClient.publish(mqttTopic, message);
  res.send(`LED command ${message}`);
});

app.listen(8000, async () => {
  console.log('Server is running on port 8000');
  sensorDataCollection = await connectMongo();
});
