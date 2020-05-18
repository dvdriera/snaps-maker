var moment = require('moment');
var sharp = require('sharp');
var admin = require('firebase-admin');
const Nightmare = require('nightmare')

const UUID = require("uuid-v4");
const serviceAccount = require('./snapspress-a5592-firebase-adminsdk-cbaql-a99cfb0bed.json');

// firebase config
const firebaseConfig = {
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://snapspress-a5592.firebaseio.com",
  storageBucket: "snapspress-a5592.appspot.com",
  timestampsInSnapshots: true,
};


console.log("SnapsPress 2020 - Snaps Maker Tool");

console.log(`

  ÛÛÛÛÛÛÛÛÛ                                         ÛÛÛÛÛÛÛÛÛÛÛ
 ÛÛÛ°°°°°ÛÛÛ                                       °°ÛÛÛ°°°°°ÛÛÛ
°ÛÛÛ    °°°  ÛÛÛÛÛÛÛÛ    ÛÛÛÛÛÛ   ÛÛÛÛÛÛÛÛ   ÛÛÛÛÛ  °ÛÛÛ    °ÛÛÛ ÛÛÛÛÛÛÛÛ   ÛÛÛÛÛÛ   ÛÛÛÛÛ   ÛÛÛÛÛ
°°ÛÛÛÛÛÛÛÛÛ °°ÛÛÛ°°ÛÛÛ  °°°°°ÛÛÛ °°ÛÛÛ°°ÛÛÛ ÛÛÛ°°   °ÛÛÛÛÛÛÛÛÛÛ °°ÛÛÛ°°ÛÛÛ ÛÛÛ°°ÛÛÛ ÛÛÛ°°   ÛÛÛ°°
 °°°°°°°°ÛÛÛ °ÛÛÛ °ÛÛÛ   ÛÛÛÛÛÛÛ  °ÛÛÛ °ÛÛÛ°°ÛÛÛÛÛ  °ÛÛÛ°°°°°°   °ÛÛÛ °°° °ÛÛÛÛÛÛÛ °°ÛÛÛÛÛ °°ÛÛÛÛÛ
 ÛÛÛ    °ÛÛÛ °ÛÛÛ °ÛÛÛ  ÛÛÛ°°ÛÛÛ  °ÛÛÛ °ÛÛÛ °°°°ÛÛÛ °ÛÛÛ         °ÛÛÛ     °ÛÛÛ°°°   °°°°ÛÛÛ °°°°ÛÛÛ
°°ÛÛÛÛÛÛÛÛÛ  ÛÛÛÛ ÛÛÛÛÛ°°ÛÛÛÛÛÛÛÛ °ÛÛÛÛÛÛÛ  ÛÛÛÛÛÛ  ÛÛÛÛÛ        ÛÛÛÛÛ    °°ÛÛÛÛÛÛ  ÛÛÛÛÛÛ  ÛÛÛÛÛÛ
 °°°°°°°°°  °°°° °°°°°  °°°°°°°°  °ÛÛÛ°°°  °°°°°°  °°°°°        °°°°°      °°°°°°  °°°°°°  °°°°°°
                                  °ÛÛÛ
                                  ÛÛÛÛÛ
                                 °°°°°
`);
console.log("Initializing...");

console.log("Connecting to Firebase ...");
admin.initializeApp(firebaseConfig);
var bucket = admin.storage().bucket();
console.log('Current working directory', process.cwd());

var snapName = function (source, size = false) {
  const sz = (size) ? '-' + size : '';
  return 'snap-' + source.id + sz + '.jpg';
}

var snapPath = function (source, size = false) {
  const fileName = snapName(source, size);
  return `${process.cwd()}/snaps/${fileName}`;
}

var upload2Firebase = (source, size) => {
  const localFile = snapPath(source, size);
  const remoteFile = moment().format('YYYYMMDD') + '/' + snapName(source, size);
  console.log("Uploading " + localFile + " ...");
  let uuid = UUID();
  return bucket.upload(localFile, {
    destination: remoteFile,
    uploadType: "media",
    metadata: {
      contentType: 'image/jpg',
      metadata: {
        firebaseStorageDownloadTokens: uuid
      }
    }
  })
    .then((data) => {
      let file = data[0];
      return Promise.resolve("https://firebasestorage.googleapis.com/v0/b/" + bucket.name + "/o/" + encodeURIComponent(file.name) + "?alt=media&token=" + uuid);
    });
}

function snapSource(source) {

  console.log(source);
  const path = snapPath(source);
  console.log(path);
  let result = false;
  const nightmare = Nightmare({ show: false });

  return nightmare
    .viewport(1024, 1800)
    .goto(source.link)
    .evaluate(function () {
      const s = document.styleSheets[0];
      try {
        s.insertRule('::-webkit-scrollbar { display:none; }');
      } catch (e) {
        // retry works
        console.log('No he pogut inserir la regla...');
      }
    })
    .screenshot(path)
    .end()
    .then(() => {
      // Generate thumbnails and crops
      const imgWidth = 1000;
      const imgHeight = 1206;
      const pathR = snapPath(source, `${imgWidth}x${imgHeight}`);
      console.log(pathR);
      sharp(path)
        .background({ r: 255, g: 255, b: 255, alpha: 1 })
        .flatten(true)
        .resize(imgWidth, imgHeight)
        .crop(sharp.gravity.north)
        .toFile(pathR).then(async () => {
          console.log(source.name + " resized!");
          // Upload to firebase storage
          result = await upload2Firebase(source, `${imgWidth}x${imgHeight}`);
          console.log(source.name + " uploaded to firebase storage!");
          console.log(result);
          return result;
        }).then(async () => {
          // Update to firebase firestore
          const db = admin.firestore();
          //let date = moment().format('YYYYMMDD');
          const docRef = db.collection("sources/").doc(source.id);
          const setSnap = docRef.update({
            snaps: {
              last: {
                link: result,
                date: moment().format('X')
              }
            }
          });
          console.log("Firestore collection: `sources/" + source.id + "/snaps` updated!");
          console.log("link: " + result);
          return setSnap;
        });
    })
    .catch((err) => {
      console.log(err);
      const db = admin.firestore();
      const docRef = db.collection("sources/").doc(source.id);
      return docRef.update({
        snaps: {
          last: {
            link: '',
            date: moment().format('X')
          }
        }
      });

    });
}

async function snapSources(sources) {
  for (var doc of sources) {
    await snapSource(doc);
  }
}

function snaps() {

  const db = admin.firestore();
  const settings = { timestampsInSnapshots: true };
  db.settings(settings);

  db.collection('sources').get()
    .then((snapshot) => {
      const sources = new Array();
      snapshot.forEach(doc => {
        let item = doc.data();
        item.id = doc.id;
        sources.push(item);
      });
      console.log(sources);
      snapSources(sources);
    })
    .catch((err) => {
      console.log('Error getting documents', err);
    });

  db.collection('options/').doc('last_update').set({ date: moment().format('YYYYMMDD') });
}

snaps();
