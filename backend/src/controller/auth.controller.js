const express = require('express');
const bcrypt = require('bcrypt');
const UserModel=require('../models/auth.model')
const jwt = require('jsonwebtoken')

async function register(req, res) {
        const { email, password } = req.body;
        // Validate input

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        // Check if user already exists

        const isUserExist= await UserModel.findOne({email})
        if(isUserExist){
            return res.status(409).json({
                 message: 'User already exists' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const User = await UserModel.create({
            email,
            password: hashedPassword,
        });
    res.status(201).json({
        message: 'User registered successfully',
        user: User
             });
}


const login = async (req, res) => {
    // Add login logic here
       try{
    const {email,password}=req.body
    const user = await UserModel.findOne({email})
    if(!user){
       return res.status(404).json({message:"User not found"})
    }
    const isPasswordValid= await bcrypt.compare(password,user.password)
     if(!isPasswordValid){
       return res.status(401).json({message:"Invalid password!!!"})
    }
   
    const token = jwt.sign({
        id:user._id,
    },process.env.JWT_SECRET,{expiresIn:"1hr"})

    // res.cookie("token",token)

    return res.status(200).json({message:" User Login successful",token,
        user:{
            id:user._id,
            name:user.name,
            email:user.email,
        }
    })
    }catch(error){
        console.error("Login error:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
    
};

async function logout(req,res){
    res.clearCookie("token")
    res.status(200).json({message:" User Logout Successfully"})
}


module.exports = {
    login,register,logout
};
