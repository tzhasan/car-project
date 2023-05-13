const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;
require("dotenv").config();
// json web token
const jwt = require("jsonwebtoken");

// midleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.S3_BUCKET}:${process.env.SECRET_KEY}@cluster0.ex2dsg0.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const vrifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({error:true,message:"unauthorized access"});
  }
  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const serviceCollection = client.db("carDoctor").collection("services");
    const CheckOutCollection = client.db("carDoctor").collection("CheckOut");

    // JWT Authentication
    app.post("/jwt", (req, res) => {
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: '1h',
      });
      // Make the token into an Object
      res.send({ token });
    });

    // service operations
    app.get("/services", async (req, res) => {
      const cursor = serviceCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const options = {
        projection: { title: 1, price: 1, service_id: 1, img: 1 },
      };
      const result = await serviceCollection.findOne(query, options);
      res.send(result);
    });

    // CheckOut Operations
    app.post("/checkout", async (req, res) => {
      const checkoutData = req.body;
      // console.log(checkoutData)
      const result = await CheckOutCollection.insertOne(checkoutData);
      res.send(result);
    });
    // booking data found manually
    app.get("/bookings",vrifyJWT,  async (req, res) => {
      const decoded = req.decoded;
      console.log('came back after vrfy',decoded)
      console.log(req.query.email);
      // console.log(req.headers.authorization);
      if (decoded.email !== req.query.email) { 
        return res.status(403).send({error:1,message:"Forbidden access"})
      }
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }
      const result = await CheckOutCollection.find(query).toArray();
      res.send(result);
    });
    // Booking data delete
    app.delete("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await CheckOutCollection.deleteOne(query);
      res.send(result);
    });
    // Booking data update(confirm)
    app.patch("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatebooking = req.body;
      console.log(updatebooking);
      const updateDoc = {
        $set: {
          status: updatebooking.status,
        },
      };
      const result = await CheckOutCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("running");
});
app.listen(port, () => {
  console.log(`running on port ${port}`);
});
