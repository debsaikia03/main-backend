import {asyncHandler} from '../utils/asyncHandler.js';
import { apiError } from '../utils/apiError.js';
import { User } from '../models/user.model.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import { apiResponse } from '../utils/apiResponse.js';

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

    if (!email || !username){
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
    .cookie("accessToken", options)
    .cookie("refreshToken", options)
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
        reg.user._id, //find user by id using middleware
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

export { registerUser, loginUser, logoutUser };