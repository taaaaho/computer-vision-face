//Messaging API Channel access token @ FACE API
var access_token = "LINE MESSAGING API TOKEN";
var google_drive_id = "Google Drive ID";
var faceApiKey = 'Computor vision api key';

// ボットにメッセージ送信/フォロー/アンフォローした時の処理
function doPost(e) {
  var events = JSON.parse(e.postData.contents).events;
  events.forEach(function(event) {
    if(event.type == "message") {
      reply(event);
    } else if(event.type == "follow") {
      follow(event);
    } else if(event.type == "unfollow") {
      unFollow(event);
    }
 });
}

function reply(e) {
  var replyToken = e.replyToken;
  if(e.message.type=="image"){
  } else {
    replyMessage(replyToken, "節子、、、これ画像ちゃう！ハジキや！！(違う)");
    return;
  }
  
  try {
    //LINE上から画像のバイナリーデータを取得
    var contentsEndPoint = 'https://api.line.me/v2/bot/message/' + e.message.id + '/content';
    var image_get_option = {
      "method":"get",
      "headers": {
        "Content-Type" : "application/json",
        "Authorization" : "Bearer " + access_token      
      }
    }
    var imageBinary = UrlFetchApp.fetch(contentsEndPoint,image_get_option);
    
    //取得したバイナリーデータを一時的にGoogleDriveに保存
    var myFolder = DriveApp.getFolderById(google_drive_id);
    var fileName = Math.random().toString(36).slice(-8);
    var getImage = myFolder.createFile(imageBinary.getBlob().setName(fileName));
    
    //画像ファイルにリンクでアクセスできるように権限付与
    getImage.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    //画像ファイル取得及びbase64形式にエンコード
    var faceImageURL = 'https://drive.google.com/uc?export=view&id=' + getImage.getId();
    var reply = executeFace(faceImageURL);
    replyMessage(replyToken,reply);
    
    //画像解析が完了したら一時保存した画像ファイルを削除
    myFolder.removeFile(getImage);
  } catch(error) {
    replyMessage(replyToken, "、、下手を打ったようだ、、、やり直してくれ、、、");
    Logger.log("Error");
    Logger.log(error);
  }
}

//ユーザーにメッセージを返信します。
function replyMessage(replyToken, message) {
  var postData = {
    "replyToken" : replyToken,
    "messages" : [
      {
        "type" : "text",
        "text" : message
      }
    ]
  };
  var options_reply = {
    "method" : "post",
    "headers" : {
      "Content-Type" : "application/json",
      "Authorization" : "Bearer " + access_token
    },
    "payload" : JSON.stringify(postData)
  };
  UrlFetchApp.fetch("https://api.line.me/v2/bot/message/reply", options_reply);
}

function executeFace(faceImageURL) {
  //Microsoft Face API
  var faceUrl = 'https://westcentralus.api.cognitive.microsoft.com/face/v1.0/detect';
  
  //FACE APIでチェックする指標を指定する
  var params = '?returnFaceId=true&returnFaceLandmarks=false&returnFaceAttributes=age,gender,smile,glasses,emotion,hair,accessories,exposure';
  //returnFaceAttributes=age,gender,headPose,smile,facialHair,glasses,emotion,hair,makeup,occlusion,accessories,blur,exposure,noise
  
  // vision API
  var body = {
    "url" : faceImageURL,
  };
  
  var head = {
    "method":"post",
    "headers": {
        "Content-Type" : "application/json",
        "Ocp-Apim-Subscription-Key":faceApiKey
      },
    "payload": JSON.stringify(body),
    "muteHttpExceptions": true
  };
  var response = UrlFetchApp.fetch(faceUrl + params, head);
  var parsedResponse = JSON.parse(response);
  if (parsedResponse[0]) {
    var faceAttributes = parsedResponse[0].faceAttributes;
    var faceInfo = '\n';
    faceInfo += '性別：' + (faceAttributes.gender == 'male' ? '男' : '女') + '\n';
    faceInfo += '年齢：' + faceAttributes.age + '歳\n';
    faceInfo += 'メガネ：' + (faceAttributes.glasses == 'NoGlasses' ? 'してない' : 'してる') + '\n';
    faceInfo += '感情：' + checkEmotion(faceAttributes.emotion) + '\n';
    faceInfo += 'ハゲ度：' + checkBald(faceAttributes.hair.bald) + '\n';
    return faceInfo;
  } else {
    return "顔が見当たりません。。";
  }
}

//ハゲ判定
function checkBald(bald) {
  if (bald <= 0.3) {
    return 'ハゲてないよ';
  } else if (bald > 0.3 && bald <= 0.7) {
    return 'まだ大丈夫だよ';
  } else if (bald > 0.7 && bald < 1) {
    return 'ハゲかけ';
  }
  return 'ハゲてる';
}

/* 
感情判定：最も値の大きい感情を正とする
同値の場合は上書きされるので用途に合わせて適宜変える
  "anger"：怒り
  "contempt"：軽蔑
  "disgust"：嫌悪
  "fear"：恐れ
  "happiness"：幸福
  "neutral"：無感情
  "sadness"：悲しみ
  "surprise"：驚き
*/
function checkEmotion(emotion) {
  var highScore = 0;
  var emotionInfo = "";
  if (highScore < emotion.anger) {
    highScore = emotion.anger;
    emotionInfo = "怒り";
  }
  if (highScore < emotion.contempt){
    highScore = emotion.contempt;
    emotionInfo = "軽蔑";
  }
  if (highScore < emotion.disgust){
    highScore = emotion.disgust;
    emotionInfo = "嫌悪";
  }
  if (highScore < emotion.fear){
    highScore = emotion.fear;
    emotionInfo = "恐れ";
  }
  if (highScore < emotion.happiness){
    highScore = emotion.happiness;
    emotionInfo = "幸福";
  }
  if (highScore < emotion.neutral){
    highScore = emotion.neutral;
    emotionInfo = "無感情";
  }
  if (highScore < emotion.sadness){
    highScore = emotion.sadness;
    emotionInfo = "悲しみ";
  }
  if (highScore < emotion.surprise){
    highScore = emotion.surprise;
    emotionInfo = "驚き";
  }
  return emotionInfo;
}
