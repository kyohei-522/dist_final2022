// Description:
//   Utility commands surrounding Hubot uptime.
//
// Commands:
//   ping - Reply with pong
//   echo <text> - Reply back with <text>
//   time - Reply with current time
'use strict';
const Clarifai = require('clarifai');
const { token } = require('./settings.json');

const app = new Clarifai.App({
  apiKey: token
});

module.exports = (robot) => {
    const onfile = (res, file) => {
      app.models.predict( Clarifai.GENERAL_MODEL, file)
      .then(function(response) {
        res.send("成功")
        let data = response.outputs[0].data.concepts;
        data.forEach(function(value) {
            // キーワードだけを表示する
            console.log(value.name);
        })
      },
      function( err ) {
        res.send("失敗")
        console.log( err );
      });
    };
    robot.respond('file', (res) => {
      onfile(res, res.json);
    });
};
