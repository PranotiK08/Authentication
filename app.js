const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");

const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "userData.db");
let db = null;
const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error '${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

// Register ApI
app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const selectUserQuery = `
    SELECT * 
    FROM user
    WHERE 
    username = '${username}';
    `;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    //Create User
    const createUserQuery = `
            INSERT INTO
            user (username,name,password,gender,location)
            VALUES (
                '${username}',
                '${name}',
                '${hashedPassword}',
                '${gender}',
                '${location}'
            );`;
    //checking the length of password
    if (password.length < 5) {
      response.status(400);
      response.send("Password is too Short");
    } // If length of password is greater then 5
    else {
      await db.run(createUserQuery);
      response.status(200);
      response.send("User created successfully");
    }
  } else {
    // User already exist
    response.status(400);
    response.send("User already exists");
  }
});

//Login API
app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `
    SELECT *
    FROM 
        user
    WHERE username = '${username}';
    `;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    //invalid Username
    response.status(400);
    response.send("Invalid user");
  } else {
    //checking password
    const isPassword = await bcrypt.compare(password, dbUser.password);
    if (isPassword === true) {
      //password id valid
      response.status(200);
      response.send("Login success!");
    } else {
      //password in invalid
      response.status(400);
      response.send("Invalid password");
    }
  }
});
//Chang password API
app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const checkForUserQuery = `
    SELECT * 
    FROM 
        user
    WHERE 
        username = '${username}';
    `;
  const dbUser = await db.get(checkForUserQuery);
  //know user exist in database or not
  if (dbUser === undefined) {
    //user not exist in database
    response.status(400);
    response.send("User not registered");
  } else {
    const isValidPassword = await bcrypt.compare(oldPassword, dbUser.password);
    if (isValidPassword === true) {
      //checking length of password
      const lengthOfPassword = newPassword.length;
      if (lengthOfPassword < 5) {
        response.status(400);
        response.send("Password is too short");
      } else {
        //update password
        const encryptPass = await bcrypt.hash(newPassword);
        const updatePassQuery = `
            UPDATE 
                user
            SET 
                password = '${encryptPass}'
            WHERE 
                username = '${username}' `;
        await db.run(updatePassQuery);
        response.send("Password updated");
      }
    } else {
      //Invalid password
      response.status(400);
      response.send("Invalid current password");
    }
  }
});
