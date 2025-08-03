import dotenv from 'dotenv';
dotenv.config();
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
    // Configuration
    cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
        api_key: process.env.CLOUDINARY_API_KEY, 
        api_secret: process.env.CLOUDINARY_API_SECRET 
    });
    

    const uploadOnCloudinary = async (localFilePath) =>{
        try {
            if(!localFilePath) return null
            //upload the file on cloudinary
            const response = await cloudinary.uploader.upload(localFilePath, {
                    resource_type : "auto"  
            });
            //file has been uploaded succesfully
            console.log("File is uploaded on Cloudinary",response.url)
            fs.unlinkSync(localFilePath)
            return response;
            
        } catch (error) {
            console.error("Cloudinary upload error:", error);
            fs.unlinkSync(localFilePath)
            return null  // unlink will remove the locally saved temporary file as the upload operation got failed
        }
    }
    const deleteFromCloudinary = async(oldfileUrl)=>{
       try {
         if(oldfileUrl){
             await cloudinary.uploader.destroy(oldfileUrl)
             console.log(`Deleted image with public ID: ${publicId}`);
         }
       } catch (error) {
        console.error(`Error deleting image: ${error}`);
       }
    };
   

    export {uploadOnCloudinary,deleteFromCloudinary}