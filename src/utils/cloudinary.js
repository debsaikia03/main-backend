import {v2 as cloudinary} from 'cloudinary';
import fs from 'fs';


// Configuration
cloudinary.config({ 
    cloud_name: 'dndavq1wo', 
    api_key: '238243237114594', 
    api_secret: 'VgW0xiJNZRPSLdDsHPZOOYO9cOo'
});

const uploadOnCloudinary = async (localFilePath) => {
    try {

        if(!localFilePath) return null;

        //upload file to cloudinary
        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type: 'auto',
        });
        //file uploaded successfully

        //console.log('File uploaded successfully',response.url); //response.url is the url of the uploaded file

        fs.unlinkSync(localFilePath,{
            resource_type: 'auto',
        }); //remove the locally saved temporary file as the upload operation succeeded

        return response; 

    } catch (error) {
        
        fs.unlinkSync(localFilePath); //remove the locally saved temporary file as the upload operation failed

        return null;
    }
}

export { uploadOnCloudinary }