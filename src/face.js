//Messaging API Channel access token @ FACE API
var access_token = PropertiesService.getScriptProperties().getProperty('ACCESS_TOKEN');
var google_drive_id = PropertiesService.getScriptProperties().getProperty('GOOGLE_DRIVE_ID');
var faceApiKey = PropertiesService.getScriptProperties().getProperty('FACE_API_KEY');

function test() {
  //Driveから保存したファイルをFileName指定でファイルを取得する
  var myFolder = DriveApp.getFolderById(google_drive_id);
  var getImage = myFolder.getFilesByName("face.jpg").next();
  
  //画像ファイルにリンクでアクセスできるように権限付与
  getImage.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  
  //画像ファイル取得及びbase64形式にエンコード
  var realImageURL = 'https://drive.google.com/uc?export=view&id=' + getImage.getId();
  
  //画像ファイルをVision APIで解析する
  var answerMessage = executeFace(realImageURL);
  Logger.log(answerMessage);
}

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
    replyMessage(replyToken, "これは画像ではありません");
    return;
  }
  
  try {
    //LINE上から画像のバイナリーデータを取得
    var imageBinary = getImageBinary(e);
    
    //Face APIで解析可能な形に変換
    var imageInfo = encodeImage(imageBinary);
    
    //Face APIで顔認識
    var faceInformation = executeFace(imageInfo.imageURL);
    
    //結果を返す
    replyMessage(replyToken, faceInformation);
    
    //画像解析が完了したら一時保存した画像ファイルを削除
    removeFile(imageInfo);
  } catch(error) {
    replyMessage(replyToken, "エラーが発生しました、、やり直してください");
    Logger.log("Error");
    Logger.log(error);
  }
}

//一時保存した画像ファイルを削除
function removeFile(imageInfo) {
  var folder = imageInfo.folder;
  var file = imageInfo.file;
  folder.removeFile(file);
}

//画像データをCloudVisionで使えるようにDriveを利用して加工する
function encodeImage(imageBinary){
  //取得したバイナリーデータを一時的にGoogleDriveに保存
  var folder = DriveApp.getFolderById(google_drive_id);
  var fileName = Math.random().toString(36).slice(-8);
  var imageFile = folder.createFile(imageBinary.getBlob().setName(fileName));
  
  //画像ファイルにリンクでアクセスできるように権限付与
  imageFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  
  //画像ファイルのURLを取得
  var imageURL = 'https://drive.google.com/uc?export=view&id=' + imageFile.getId();

  //処理後にファイルを削除するため必要な情報をまとめる
  var imageInfo = {
    folder:folder,
    file:imageFile,
    imageURL:imageURL
  }
  return imageInfo;
}

//LINEから画像データをバイナリー形式で取得
function getImageBinary(e) {
  var contentsEndPoint = 'https://api-data.line.me/v2/bot/message/' + e.message.id + '/content';
  var image_get_option = {
    "method":"get",
    "headers": {
      "Content-Type" : "application/json",
      "Authorization" : "Bearer " + access_token      
    }
  }
  var imageBinary = UrlFetchApp.fetch(contentsEndPoint,image_get_option);
  return imageBinary;
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
  //Microsoft Azure Face API
  var faceUrl = 'https://japaneast.api.cognitive.microsoft.com/face/v1.0/detect?returnFaceId=true&returnFaceLandmarks=false';
  
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
  Logger.log(parsedResponse);
  if (parsedResponse[0]) {
    var faceAttributes = parsedResponse[0].faceAttributes;
    var faceInfo = 'この顔は、、、\n';
    faceInfo += '性別：' + (faceAttributes.gender == 'male' ? '男' : '女') + '\n';
    faceInfo += '年齢：' + faceAttributes.age + '歳\n';
    faceInfo += '笑顔：' + Math.round(faceAttributes.smile * 100) + '%\n';
    faceInfo += 'メガネ：' + (faceAttributes.glasses == 'NoGlasses' ? 'してない' : 'してる') + '\n';
    faceInfo += '感情：' + checkEmotion(faceAttributes.emotion) + '\n';
    faceInfo += 'ハゲ度：' + checkBald(faceAttributes.hair.bald);
    return faceInfo;
  } else {
    return "顔が見当たりません。。";
  }
}

//ハゲ判定
function checkBald(bald) {
  if (bald <= 0.3) {
    return 'ハゲてないよ';
  } else if (bald > 0.3 && bald <= 0.6) {
    return 'まだ大丈夫だよ';
  } else if (bald > 0.6 && bald < 0.9) {
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
