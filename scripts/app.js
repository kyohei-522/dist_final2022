const fs = require("fs");

//save local
const path = require("path");
const Jimp = require('jimp');

//googleAPI
const {google} = require('googleapis');
const {GoogleAuth} = require('google-auth-library');
const privatekey = require("./privatekey.json");

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
        const imageBytes = fs.readFileSync(path, { encoding: "base64" });
        let ext = file.name.slice(-4);
        Jimp.read(path).then((image) => {
            let newFileName = Math.random().toString(32).substring(2) + ext;
            image.write('images/' + newFileName, (err, image) => {
              // res.send({
              //   path: 'images/' + newFileName
              // });
              console.log('save local file')
            });
          });
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
            res.send({
              question: 'どのタグをつける？',
              options: msg,
              onsend: (sent) => {
              questionSentId[res.message.rooms[res.message.room].id] = sent.message.id;
              }
              });
          }
        );
      });
    };
    robot.respond('file', (res) => {
      onfile(res, res.json);
    });
    robot.respond('select', (res) => {
      if (res.json.response === null) {
      res.send(`Your question is ${res.json.question}.`);
      } else {
        //rename&move
        const dir = "./images";
        const addHead = res.json.options[res.json.response] + '_';
        const fileNameList = fs.readdirSync(dir);
        const targetFileNames = fileNameList.filter(RegExp.prototype.test, /.*\.jpg$/); // jpg filter
        console.log(targetFileNames);
        targetFileNames.forEach(fileName => {
          // console.log(fileName)
          const filePath = {};
          const newName = addHead + fileName;
          const moved_dir = "./images/add_tag";
          filePath.before = path.join(dir, fileName);
          filePath.after = path.join(moved_dir, newName);
          // console.log(filePath);
        fs.rename(filePath.before, filePath.after, err => {
          if (err) throw err;
          console.log(filePath.before + "-->" + filePath.after);
        });
        });
        res.send({
          text: `${res.json.options[res.json.response]}でタグ付しました`,
          onsend: (sent) => {
            res.send({
              close_select: questionSentId[res.message.rooms[res.message.room].id]
            });
          }
        });
      }
    });
    // robot.respond(/PING$/i, (res) => {
    //driveにアップロードするテスト（うまく行かない。バージョンエラー？）
    //   upload();
    //   res.send('PONG');
    // });
};

// async function upload() {
//   // Get credentials and build service
//   // TODO (developer) - Use appropriate auth mechanism for your app
//   const auth = new GoogleAuth({scopes: 'https://www.googleapis.com/auth/drive'});
//   const service = google.drive({version: 'v3', auth});
//   const fileMetadata = {
//     'title': 'test.jpg',
//   };
//   const media = {
//     mimeType: 'image/jpeg',
//     body: fs.createReadStream('images/test.jpg'),
//   };
//   try {
//     const file = await service.files.create({
//       resource: fileMetadata,
//       media: media,
//       fields: 'id',
//     });
//     console.log('File Id:', file.data.id);
//     return file.data.id;
//   } catch (err) {
//     // TODO(developer) - Handle error
//     throw err;
//   }
// }