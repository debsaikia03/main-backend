import {asyncHandler} from '../utils/asyncHandler.js';
import { apiError } from '../utils/apiError.js';
import { User } from '../models/user.model.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { apiResponse } from '../utils/apiResponse.js';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';


const generateAccessAndRefreshTokens = async(userId) =>
{ 
    try {

        const user = await User.findById(userId); //find the user
        const accessToken = user.generateAccessToken(); //generate access token
        const refreshToken = user.generateRefreshToken(); //generate refresh token

        user.refreshToken = refreshToken; //save refresh token in DB
        user.save({validateBeforeSave: false}); //save user without validation

        return {accessToken, refreshToken}; //return tokens
        
    } catch (error) {
        throw new apiError(500, "Token generation failed");
    }
}

const registerUser = asyncHandler(async (req, res) => {

    //get user details from frontend

    //validation - not empty

    //check if user already exists: username, email

    //check for images , check for avatar

    //upload them to cloudinary, avatar 

    //create user object -> required for noSQL DB (MongoDB) -> create entry in DB

    //remove password and refreshToken from response

    //check for user creation

    //return response

    const {fullName, email, username, password} = req.body; //get user details from frontend
    console.log("email", email);

    /*if (fullName === ""){
        throw new apiError(400, "Fullname is required");
    }*/

    if (
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ){
        throw new apiError(400, "All fields are required");
    };

    const existedUser = await User.findOne({
        $or:[{ username }, { email }]
    });

    if (existedUser){
        throw new apiError(409, "User already exists");
    }   

    console.log(req.files);

    const avatarLocalPath = req.files?.avatar[0]?.path;
    //const coverImageLocalPath = req.files?.coverImage[0]?.path;

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){ //check for coverImage present or not since it's a non-required field
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    if(!avatarLocalPath ){
        throw new apiError(400, "Avatar is required");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath); //upload avatar to cloudinary
    const coverImage = await uploadOnCloudinary(coverImageLocalPath); //upload coverImage to cloudinary

    if (!avatar){ //check for avatar upload
        throw new apiError(400, "Avatar is required");
    }

    const user = await User.create({ //create user object
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    });

    const createdUser = await User.findById(user._id).select( 
        "-password -refreshToken" //remove password and refreshToken from response
    );

    if (!createdUser){ //check for user creation
        throw new apiError(500, "User creation failed"); 
    };

    return res.status(201).json( //return response
        new apiResponse(200, createdUser, "User registered successfully")
    );

});

const loginUser = asyncHandler(async (req, res) => {
    
    // req body -> data
    // username or email
    // find the user
    // password check
    // generate access and refresh token
    // send cookies

    const {email, username, password} = req.body;

    if (!(email || username)){  //username or email is required
        throw new apiError(400, "Email or username is required");
    };

    const user = await User.findOne({
        $or: [{username}, {email}]
    });

    if (!user){
        throw new apiError(404, "User not found");
    };

    const isPasswordValid = await user.isPasswordCorrect(password);

    if(!isPasswordValid){
        throw new apiError(401, "Invalid user credentials");
    };

    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id);

    const loggedInUser =await User.findById(user._id).select(
        "-password -refreshToken"
    );

    const options = {
        httpOnly: true,
        secure: true
    };

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new apiResponse(
            200,
            {
                user: loggedInUser,
                accessToken,
                refreshToken
            },

            "User logged in successfully"
        )
    );
        
});

const logoutUser = asyncHandler(async (req, res) => {
    
    await User.findByIdAndUpdate( //update refreshToken to undefined
        req.user._id, //find user by id using middleware
        {
            $set: {refreshToken: undefined}
        },
        {
            new: true
        }
    );

    const options = { 
        httpOnly: true,
        secure: true
    };

    //clear cookies

    return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
        new apiResponse(200, {}, "User logged out successfully")
    );

});


const refreshAccessToken = asyncHandler(async (req, res) => { 

    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if(!incomingRefreshToken){
        throw new apiError(400, "Unauthorized request");
    };

try {
        const decodedToken = jwt.verify(
            incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET
        );
    
        const user = await User.findById(decodedToken?._id);
    
        if (!user){
            throw new apiError(401, "Invalid refresh token");
        };
    
        if (incomingRefreshToken !== user?.refreshToken){
            throw new apiError(401, "Refresh token is expired or used");
        };
    
        const options = {
            httpOnly: true,
            secure: true
        }
    
        const {accessToken, newRefreshToken} = await generateAccessAndRefreshTokens(user._id)
    
        return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new apiResponse(
                200,
                {accessToken, refreshToken: newRefreshToken},
                "Access token refreshed successfully"
            )
        );
} catch (error) {

    throw new apiError(401, error?.message || "Invalid refresh token");
}

});

const changeCurrentPassword = asyncHandler(async (req, res) => {

    const {oldPassword, newPassword} = req.body;

    const user = await User.findById(req.user?._id); //find user by id

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword); //check if old password is correct

    if(!isPasswordCorrect){
        throw new apiError(401, "Invalid current password");
    };

    user.password = newPassword; //update password
    user.save({validateBeforeSave: false}); //save user without validation

    return res  //return response 
    .status(200)
    .json(
        new apiResponse(200, {}, "Password changed successfully")
    );

});

const getCurrrentUser= asyncHandler(async (req, res) => {

    return res
    .status(200)
    .json(
        new apiResponse(200, req.user, "Currrent user details fetched successfully")
    );
});

const updateAccountDetails = asyncHandler(async (req, res) => {

    const { fullName, email } = req.body;

    if ( !fullName || !email ) { 

        throw new apiError(400, "All fields are required");
    };

    const user = User.findByIdAndUpdate(

        req.user?._id,
        {
            $set: {
                fullName,
                email
            }
        },
        {
            new: true
        }
    ).select("-password");

    return res
    .status(200)
    .json(
        new apiResponse(200, user, "Account details updated successfully")
    );
    
});


const updateUserAvatar = asyncHandler(async (req, res) => {

    const avatarLocalPath = req.file?.path;

    if(!avatarLocalPath){
        throw new apiError(400, "Avatar is required");
    };

    //todo: delete old avatar from cloudinary
    
    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if(!avatar.url){
        throw new apiError(400, "Avatar upload failed");
    };

    const user = await User.findByIdAndUpdate(

        req.user?._id,

        {
            $set: {
                avatar: avatar.url
            }
        },
        {
            new: true
        }
    ).select("-password");

    return res
    .status(200)
    .json(
        new apiResponse(200, user, "Avatar updated successfully")
    );

});

const updateUserCoverImage = asyncHandler(async (req, res) => {

    const coverImageLocalPath = req.file?.path;

    if(!coverImageLocalPath){
        throw new apiError(400, "Cover Image is required");
    };

    //todo: delete old coverImage from cloudinary

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if(!coverImage.url){
        throw new apiError(400, "Cover Image upload failed");
    };

    const user = await User.findByIdAndUpdate(
        
        req.user?._id,

        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {
            new: true
        }
    ).select("-password");

    return res
    .status(200)
    .json(
        new apiResponse(200, user, "Cover Image updated successfully")
    );

});

const getUserChannelProfile = asyncHandler(async (req, res) => {

    const { username } = req.params;

    if (!username?.trim()){
        throw new apiError(400, "Username is required");
    };

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {

                subscriberCount: {
                    $size: "$subscribers"
                },

                channelsSubscribedTo: {
                    $size: "$subscribedTo"
                },

                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $projects: {
                fullName: 1,
                username: 1,
                subscriberCount: 1,
                channelsSubscribedTo: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }

    ]);

    if(!channel?.length){  //check for channel
        throw new apiError(404, "Channel not found");
    };
    
    return res
    .status(200)
    .json(
        new apiResponse(200, channel[0], "user channel profile fetched successfully")
    );
});

const getWatchHistory = asyncHandler(async (req, res) => {

    const user = await User.aggregate([
        {

            $match: {
                _id: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup : {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {

                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addfields : {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ]);

    return res
    .status(200)
    .json(
        new apiResponse(200, user[0].watchHistory, "Watch history fetched successfully")
    );
});

export { 

    registerUser, 
    loginUser, 
    logoutUser, 
    refreshAccessToken, 
    changeCurrentPassword, 
    getCurrrentUser, 
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory

};