const fs = require("fs");

//googleAPI
const {google} = require('googleapis');
const {GoogleAuth} = require('google-auth-library');
const privatekey = require("./privatekey.json");
const Jimp = require('jimp');

let jwtClient = new google.auth.JWT(
  privatekey.client_email,
  null,
  privatekey.private_key,
  ['https://www.googleapis.com/auth/drive']);

jwtClient.authorize((err, tokens) => {
  if (err) {
    console.log(err);
    return; 
  }
  console.log("Google Oauth authorization succeeded");
  });

//clarifai
const { ClarifaiStub, grpc } = require("clarifai-nodejs-grpc");
const stub = ClarifaiStub.grpc();
const metadata = new grpc.Metadata();

const { token, General, folderID } = require('./settings.json');

const api_key = token;
metadata.set("authorization", "Key " + api_key);

module.exports = (robot) => {
    let questionSentId = {};
    const onfile = (res, file) => {
      res.download(file, (path) => {
        let ext = file.name.slice(-4);
        Jimp.read(path).then((image) => {
            let newFileName = Math.random().toString(32).substring(2) + ext;
            image.write('images/' + newFileName, (err, image) => {
              res.send({
                path: 'images/' + newFileName
              });
            });
          });
        });
        // const auth = new GoogleAuth({scopes: 'https://www.googleapis.com/auth/drive'});
        // const drive = google.drive({version: 'v3', auth});
        // const fileName = file.name;
        // const folderId = folderID;
        // const params = {
        //   resource: {
        //       name: fileName,
        //       parents: [folderId]
        //   },
        //   media: {
        //       mimeType: 'image/jpeg',
        //       body: fs.createReadStream()
        //     },
        //     fields: 'id'
        // };
        // const res = drive.files.create(params);
        // console.log(res.data);
        stub.PostModelOutputs(
          {
            // This is the model ID of a publicly available General model. You may use any other public or custom model ID.
            model_id: General,
            inputs: [{ data: { image: { base64: imageBytes } } }]
          },
          metadata,
          (err, response) => {
            if (err) {
              console.log("Error: " + err);
              return;
            }
        
            if (response.status.code !== 10000) {
              console.log("Received failed status: " + response.status.description + "\n" + response.status.details + "\n" + response.status.code);
              return;
            }
        
            console.log("Predicted concepts, with confidence values:");
            let cnt = 0;
            let msg = [];
            for (const c of response.outputs[0].data.concepts) {
              if (cnt > 5) {
                break;
              }
              msg.push(c.name);
              cnt += 1;
            }
            // res.send({
            //   question: 'どの名前で保存する？',
            //   options: msg,
            //   onsend: (sent) => {
            //   questionSentId[res.message.rooms[res.message.room].id] = sent.message.id;
            //   }
            //   });
          }
        );
      };
    robot.respond('file', (res) => {
      onfile(res, res.json);
    });
    robot.respond('select', (res) => {
      if (res.json.response === null) {
      res.send(`Your question is ${res.json.question}.`);
      } else {
      res.send({
      text: `${res.json.options[res.json.response]}で画像を保存しました`,
      onsend: (sent) => {
      res.send({
        close_select: questionSentId[res.message.rooms[res.message.room].id]
      });
      }
      });
      }
      let newFileName = res.json.options[res.json.response];
      
    });
};
