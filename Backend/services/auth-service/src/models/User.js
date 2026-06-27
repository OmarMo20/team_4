const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const config = require("../config");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email address",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false, // Don't include password in queries by default
    },
    phone: {
      type: String,
      trim: true,
    },
    subject: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: ["admin", "teacher", "assistant", "parent"],
      default: "teacher",
    },
    teacherCode: {
      type: String,
      unique: true,
      sparse: true, // Allow nulls for non-teachers if needed, though we'll generate for all
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        delete ret.password;
        return ret;
      },
    },
  },
);

userSchema.index({ email: 1 });
userSchema.index({ createdAt: -1 });

userSchema.pre("save", async function (next) {
  try {
    // Generate teacherCode if missing
    if (
      !this.teacherCode &&
      (this.role === "teacher" || this.role === "admin")
    ) {
      let isUnique = false;
      let code;
      while (!isUnique) {
        code = Math.floor(10000 + Math.random() * 90000).toString();
        const existing = await mongoose
          .model("User")
          .findOne({ teacherCode: code });
        if (!existing) isUnique = true;
      }
      this.teacherCode = code;
    }

    if (!this.isModified("password")) {
      return next();
    }

    const salt = await bcrypt.genSalt(config.bcrypt.saltRounds);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.generateAuthToken = function () {
  const payload = {
    id: this._id,
    email: this.email,
    role: this.role,
  };

  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
};

userSchema.methods.updateLastLogin = async function () {
  this.lastLogin = new Date();
  await this.save({ validateBeforeSave: false });
};

userSchema.statics.findByCredentials = async function (email, password) {
  const user = await this.findOne({ email, isActive: true }).select(
    "+password",
  );

  if (!user) {
    return null;
  }

  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    return null;
  }

  return user;
};

const User = mongoose.model("User", userSchema);

module.exports = User;
