  const express = require('express');
  const mqtt = require('mqtt');

  const app = express();
  const mqttBrokerUrl = 'mqtts://cfb2b6afd6964117af879a0b7d570659.s1.eu.hivemq.cloud';
  const mqttUsername = 'Dattt';
  const mqttPassword = 'Dat123456';
  const mqttTopic = 'cq21/nhom3/led';

  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    next();
  });

  const mqttClient = mqtt.connect(mqttBrokerUrl, {
    username: mqttUsername,
    password: mqttPassword
  });
  let sensorData = { temper: 0, humid: 0, state: false };
  let stateWarming = 0;
  mqttClient.on('connect', () => {
    console.log('Connected to MQTT broker');
    mqttClient.subscribe(mqttTopic, (err) => {
      if (err) {
        console.error('Error subscribing to topic:', err);
      } else {
        console.log('Subscribed to topic:', mqttTopic);
      }
    });
  });
  mqttClient.on('message', (topic, message) => {
    console.log('Received message from topic:', topic);
    console.log('Message:', message.toString());
  });

  app.get('/', (req, res) => {
    res.send('Express server is running');
  });

  app.post('/control/:id', (req, res) => {
    const { id } = req.params;
    mqttClient.publish(mqttTopic, id);
    res.send(`${id == 1 ? 'On' : 'Off'}`);
  });

  app.listen(8000, () => {
    console.log('Server is running on port 8000');
  });