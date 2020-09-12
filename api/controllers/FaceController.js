'use strict';
const models = require('../db/models/index');
const status = require('http-status');
const axios = require('axios');
let imageUrl = 'https://raw.githubusercontent.com/Azure-Samples/cognitive-services-sample-data-files/master/ComputerVision/Images/faces.jpg';
module.exports = {
  upload: {
    async post(req, res, next) {  
      try {
        axios({
          method: 'post',
          url: process.env.FACEAPI_ENDPOINT,
          params : {
              returnFaceId: true,
              returnFaceLandmarks: false,
              returnFaceAttributes: 'age,gender,headPose,smile,facialHair,glasses,emotion,hair,makeup,occlusion,accessories,blur,exposure,noise'
          },
          data: {
              url: imageUrl,
          },
          headers: { 'Ocp-Apim-Subscription-Key': ev }
      }).then(function (response) {
          console.log('Status text: ' + response.status)
          console.log('Status text: ' + response.statusText)
          console.log()
          //console.log(response.data)
          response.data.forEach((face) => {
            console.log('Face ID: ' + face.faceId)
            console.log('Face rectangle: ' + face.faceRectangle.top + ', ' + face.faceRectangle.left + ', ' + face.faceRectangle.width + ', ' + face.faceRectangle.height)
            console.log('Smile: ' + face.faceAttributes.smile)
            console.log('Head pose: ' + JSON.stringify(face.faceAttributes.headPose))
            console.log('Gender: ' + face.faceAttributes.gender)
            console.log('Age: ' + face.faceAttributes.age)
            console.log('Facial hair: ' + JSON.stringify(face.faceAttributes.facialHair))
            console.log('Glasses: ' + face.faceAttributes.glasses)
            console.log('Smile: ' + face.faceAttributes.smile)
            console.log('Emotion: ' + JSON.stringify(face.faceAttributes.emotion))
            console.log('Blur: ' + JSON.stringify(face.faceAttributes.blur))
            console.log('Exposure: ' + JSON.stringify(face.faceAttributes.exposure))
            console.log('Noise: ' + JSON.stringify(face.faceAttributes.noise))
            console.log('Makeup: ' + JSON.stringify(face.faceAttributes.makeup))
            console.log('Accessories: ' + JSON.stringify(face.faceAttributes.accessories))
            console.log('Hair: ' + JSON.stringify(face.faceAttributes.hair))
            console.log()
          });
      }).catch(function (error) {
          console.log(error)
      });
      } catch (error) {
        next(error);
      }
    }
  },
};