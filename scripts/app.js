const { ClarifaiStub, grpc } = require("clarifai-nodejs-grpc");
const fs = require("fs");

const stub = ClarifaiStub.grpc();

const metadata = new grpc.Metadata();

const { token, General } = require('./settings.json');
const api_key = token;
metadata.set("authorization", "Key " + api_key);

module.exports = (robot) => {
    let questionSentId = {};
    const onfile = (res, file) => {
      res.download(file, (path) => {
        const imageBytes = fs.readFileSync(path, { encoding: "base64" });
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
              question: 'どの単語？',
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
      res.send({
      text: `${res.json.options[res.json.response]}について検索します`,
      onsend: (sent) => {
      res.send({
      close_select: questionSentId[res.message.rooms[res.message.room].id]
      });
      }
      });
      }
      });
};
