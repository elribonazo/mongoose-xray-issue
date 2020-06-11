const express = require('express');
const app = express();
const port = 3000;
const AWSXRay = require('aws-xray-sdk');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;



class Model extends mongoose.model {

    constructor(obj) {
        if (!obj.schema) {
            throw new Error("Please specify a schema when initializing a model");
        }
        if (!obj.name) {
            throw new Error("Please specify the model name when initializing a model");
        }

        const { schema, name } = obj;
        const baseSchema = new mongoose.Schema(schema);
        if (obj.hooks && Array.isArray(obj.hooks)) {
            obj.hooks.forEach((hook) => {
                baseSchema[hook.lifeCycle](hook.name, hook.method);
            });
        }

        if (mongoose.models && mongoose.models[name]) {
            super(name);
        } else {
            super(name, baseSchema);
            if (obj.methods && typeof obj.methods === "object") {
                const methodNames = Object.keys(obj.methods);
                for (let i = 0; i < methodNames.length; i++) {
                    const methodName = methodNames[i];
                    this[methodName] = obj.methods[methodName].bind(this);
                }
            }
        }
    }

}





(async () => {
    try {

        const route = express.Router();
        AWSXRay.setDaemonAddress('localhost:30062');
        app.use(AWSXRay.express.openSegment(`WHATEVER`));
        mongoose.plugin(require('mongoose-xray'), { verbose: false });



        app.use(route.get('/', async (req, res) => {
            const first = await DemoModel.findOne({});
            if (first) {
                return res.send('Hello World!' + first.name)
            }
            return res.send('Hello World! nobody found')

        }))

        const options = {};
        if (process.env.NODE_ENV && process.env.NODE_ENV !== 'production') {
            options.useNewUrlParser = false;
            options.ssl = true;
            options.dbName = 'db_prod';
        }

        await mongoose.connect('mongodb://127.0.0.1:30055/db_prod', options);

        const DemoModel = new Model({
            name: 'DemosModel',
            schema: {
                name: {
                    type: String
                }
            }
        })
        await DemoModel.create({ name: 'demo name' });


        app.use(AWSXRay.express.closeSegment());


        app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`))

    } catch (err) {
        console.log("debug", err);
        process.exit(0);
    }
})();
