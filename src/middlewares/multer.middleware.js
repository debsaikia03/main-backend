import multer from 'multer';

// Multer configuration
const storage = multer.diskStorage({ // diskStorage is used to store the file on the disk
    destination: function (req, file, cb) { 

      cb(null, './public/temp') // file will be stored in the public/temp folder
    },
    filename: function (req, file, cb) {

      cb(null, file.originalname) // file name will be the original name of the file
    }
  })
  
export const upload = multer({ storage, }) // upload is a middleware that will handle the file upload