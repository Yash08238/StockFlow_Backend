const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User");
const config = require("./config");

module.exports = (passport) => {
  console.log(
    "Google OAuth callback URL:",
    `${process.env.BACKEND_URL}/api/user/google/callback`
  );

  passport.use(
    new GoogleStrategy(
      {
        clientID: config.googleClientId,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${
          process.env.BACKEND_URL || "http://localhost:3000"
        }/api/user/google/callback`,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // console.log("Google Profile:", profile);
          const email = profile.emails[0].value.toLowerCase(); // Force lowercase
          const googleId = profile.id;
          const name = profile.displayName;

          console.log("Passport: Google Email received:", email);

          // Check if user exists by email
          let user = await User.findOne({ email });
          console.log("Passport: Existing User found?", user ? user._id : "No");
          const picture =
            profile.photos && profile.photos[0] ? profile.photos[0].value : "";

          if (user) {
            // ONLY update user image if they don't have one, or if it's currently a Google URL
            // This prevents overwriting manual Cloudinary uploads.
            const isGoogleUrl =
              user.image && user.image.includes("googleusercontent.com");
            const isEmpty = !user.image;

            if (picture && (isEmpty || isGoogleUrl)) {
              user.image = picture;
              await user.save();
            }
            return done(null, user);
          }

          // Create new user
          // Username logic: Name + Random
          const username =
            name.replace(/\s+/g, "").toLowerCase() +
            Math.floor(1000 + Math.random() * 9000);
          const password =
            Math.random().toString(36).slice(-8) +
            Math.random().toString(36).slice(-8);

          user = new User({
            username,
            email,
            password,
            image: picture,
            role: "user", // Default
            // googleId: googleId // If I add googleId to schema? User snippet had it. I should probably add it.
          });

          await user.save();
          return done(null, user);
        } catch (error) {
          console.error("Passport Error:", error);
          return done(error, null);
        }
      }
    )
  );
};
