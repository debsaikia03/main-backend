//this middleware is used to check if the user is authenticated or not
import { apiError } from '../utils/apiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model.js';

export const verifyJWT = asyncHandler(async (req, _, next) => {

    try {
        const token = req.cookies?.accessToken || req.header('Authorization')?.replace('Bearer ', ''); //extracting token from request object
    
        if (!token) { //if token is not present
            throw new apiError(401, 'Unauthorized request');
        };
    
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET); //verifying token
    
        const user = await User.findbyId(decodedToken?._id).select(
            '-password -refreshToken' 
        ); //finding user by id 
    
        if(!user){ //if user is not found
    
            throw new apiError(401, 'Invalid access token');
        }; 
    
        req.user = user; //attaching user to request object
        next(); //move to next middleware

    } catch (error) { //if token is invalid

        throw new apiError(401, error?.message || 'Invalid access token');
    };
});