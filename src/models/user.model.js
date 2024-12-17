import mongoose, {Schema} from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            index: true //for optimization in searching purpose in database
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },  

        fullName: {
            type: String,
            required: true,
            trim: true,
            index: true //for optimization in searching purpose in database
        },

        avatar: {
            type: String, //cloudinary service url (free)
            required: true,
        },

        coverImage : {
            type: String, //cloudinary service url (free)
        },

        watchHistory: [
            {
                type: Schema.Types.ObjectId,
                ref: 'Video'
            }
        ],

        password: {
            type: String,
            required: [true, 'Password id required']
        },

        refreshToken: {
            type: String
        }
    },
    {
        timestamps: true
    }
);

userSchema.pre("save", async function (next) {

    if(!this.isModified('password')){
        return next(); //move to next middleware
    }

    this.password = await bcrypt.hash(this.password, 10); //hashing password
    next(); //move to next middleware
})

//custom methods
userSchema.methods.isPasswordCorrect = async function (password)  {  

   return await bcrypt.compare(password, this.password); //return true or false
}

//Generate access token using jwt 
userSchema.methods.generateAccessToken = function () {  

    return jwt.sign(
        {  //payload

            _id: this._id,
            email: this.email,
            username: this.username,
            fullname: this.fullname,
        },

        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

//Generate refresh token using jwt
userSchema.methods.generateRefreshToken = function () {

    return jwt.sign(
        {  //payload

            _id: this._id,

        },

        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}   


export const User = mongoose.model('User', userSchema); 

