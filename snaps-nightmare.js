var moment 	= require('moment');
var sharp 	= require('sharp');
var admin 		= require('firebase-admin');
const Nightmare = require('nightmare')

const UUID = require("uuid-v4");

var serviceAccount = require('./snapspress-a5592-firebase-adminsdk-oifgh-eab6d916eb.json');

// firebase config
const firebaseConfig = {
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://snapspress-a5592.firebaseio.com",
  storageBucket: "snapspress-a5592.appspot.com",  
};


console.log("SnapsPress 2018 - Snaps Maker Tool");

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

var snapName = function(source, size = false) {
	const sz = (size) ? '-' + size : '';
	return 'snap-' + source.id + sz + '.jpg';	
}

var snapPath = function(source, size = false) {
	const fileName = snapName(source, size); 
	return '/tmp/' + fileName;	
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

function snapSource (source) {

    const path = snapPath(source);
    var result = false;
    var nightmare = Nightmare({ show: false });

    return nightmare
    .viewport(1024,2500)
    .goto(source.link)
    .evaluate(function() { 
        var s = document.styleSheets[0];

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
       const pathR = snapPath(source, '500x603');
       sharp(path)
       .background({r: 255, g: 255, b: 255, alpha: 1})
       .flatten(true)
       .resize(500, 603)
       .crop(sharp.gravity.north)
       .toFile(pathR).then( async () => {
          console.log(source.name + " resized!");
          // Upload to firebase storage
          result = await upload2Firebase(source, '500x603');
            console.log(source.name + " uploaded to firebase storage!");
            console.log(result);
            return result;        
        }).then( async () => {
          // Update to firebase firestore
          let db = admin.firestore();
          let date = moment().format('YYYYMMDD');
          let docRef = db.collection("sources/").doc(source.id);
          var setSnap = docRef.set({
            snaps : {
              "last" :        {
                link: result,
                date: moment().format('X')
              } 
            }
          },{ merge: true });
          console.log("Firestore collection: `sources/"+source.id+"/snaps` updated!");
          console.log("link: " + result);
          return setSnap;
        });
     })
    .then(() => {
       // Generate thumbnails and crops
       const pathR = snapPath(source, '25x30');
       sharp(path)
       .background({r: 255, g: 255, b: 255, alpha: 1})
       .flatten(true)
       .resize(25, 30)
       .crop(sharp.gravity.north)
       .toFile(pathR).then( async () => {
          console.log(source.name + " resized!");
          // Upload to firebase storage
          result = await upload2Firebase(source, '25x30');
            console.log(source.name + " uploaded to firebase storage!");
            console.log(result);
            return result;
        }).then( async () => {
          // Update to firebase firestore
          let db = admin.firestore();
          let date = moment().format('YYYYMMDD');
          let docRef = db.collection("sources/").doc(source.id);
          var setSnap = docRef.set({
            snaps : {
              "last" :        {
                link_thumb: result,
                date: moment().format('X')
              }
            }
          },{ merge: true });
          console.log("Firestore collection: `sources/"+source.id+"/snaps` updated!");
          console.log("link: " + result);
          return setSnap;
        });
     })
    .catch((err) => {
      console.log(err);
    });

    /*
    // Generate thumbnails and crops
    const pathR = snapPath(source, '522x625');
    await sharp(path).resize(522, 625).crop(sharp.gravity.north).toFile(pathR);
    console.log(source.name + " resized!");	    
    
    // Upload to firebase storage
    const result = await upload2Firebase(source);
    console.log(source.name + " uploaded to firebase storage!");

   	// Update to firebase firestore
   	let db = admin.firestore();
   	let date = moment().format('YYYYMMDD');
   	let docRef = db.collection("sources/").doc(source.id);
  	var setSnap = docRef.set({
  		snaps : {
  			null : 	{
  				link: result,
  	    			date: moment().format('X')
  	    		},
                          "last" :        {
                                  link: result,
                          	date: moment().format('X')
                  	}	
  		}
  	},{ merge: true });

    console.log("Firestore collection: `sources/"+source.id+"/snaps` updated!");
    return result;

  */
}

async function snapSources(sources){
  for (var doc of sources) {
    await snapSource(doc);
    console.log(doc);
  }
}

function snaps() {

  let db = admin.firestore();
  db.collection('sources').get()
      .then((snapshot) => {
          var item = {};
          var sources = new Array();
          snapshot.forEach(doc => {
            item = doc.data();
            item.id = doc.id;
            sources.push(item);
          });        
          snapSources(sources);
      })
      .catch((err) => {
          console.log('Error getting documents', err);
      });

  db.collection('options/').doc('last_update').set({ date : moment().format('YYYYMMDD') });  
}

snaps();
