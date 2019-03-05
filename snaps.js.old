var mysql 	= require('mysql');
var moment 	= require('moment');
var sharp 	= require('sharp');
var phantom 	= require('phantom');
var admin 		= require('firebase-admin');

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
	return 'snap-' + source.id + '-' + sz + '.jpg';	
}

var snapPath = function(source, size = false) {
	const fileName = snapName(source, size); 
	return '/tmp/snaps/' + moment().format('YYYYMMDD') + '/' + fileName;	
}

var upload2Firebase = (source) => {
	const localFile = snapPath(source, '522x625');
	const remoteFile = moment().format('YYYYMMDD') + '/' + snapName(source, '522x625');
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

var snap = async function(doc) {

    var source = doc.data();
    source.id = doc.id;

    // Load the website and take the snap    
    const instance = await phantom.create();
    const page = await instance.createPage();
    await page.property("viewportSize", {width: 1024, height: 10000});
    await page.open(source.link);
    const path = snapPath(source);
    await page.render(path, {format: 'jpeg', quality: '90'});    
    console.log(source.name + " snapped!");    
    instance.exit();

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
}

let db = admin.firestore();
db.collection('sources').get()
    .then((snapshot) => {
        snapshot.forEach( (doc) => snap(doc) );
    })
    .catch((err) => {
        console.log('Error getting documents', err);
    });

db.collection('options/').doc('last_update').set({ date : moment().format('YYYYMMDD') });

