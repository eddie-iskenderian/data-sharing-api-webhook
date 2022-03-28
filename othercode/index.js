const AWS = require('aws-sdk')

const ATHENA_DB = 'events'
const ATHENA_OUTPUT_LOCATION = 's3://eddie-data-platform-testing/athena-csv-sharing/'

let client = new AWS.Athena({region: 'ap-southeast-2'})

AWS.config.update({region: 'REGION'});
let sqs = new AWS.SQS({ apiVersion: '2012-11-05' });

async function handler() {
  try {
    /* Make a SQL query and display results */
    let data = await makeQuery("SELECT * FROM action_receipt_post limit 10;")
  } catch (e) {
    console.log('ERROR: ', e);
  }


  function makeQuery(sql) {
    return new Promise((resolve, reject) => {
      let params = {
        QueryString: sql,
        ResultConfiguration: { OutputLocation: ATHENA_OUTPUT_LOCATION },
        QueryExecutionContext: { Database: ATHENA_DB }
      }

      /* Make API call to start the query execution */
      client.startQueryExecution(params, (err, results) => {
        if (err) return reject(err)
        /* If successful, get the query ID and queue it for polling */
        var params = {
          // Remove DelaySeconds parameter and value for FIFO queues
        //  DelaySeconds: 0,
         MessageAttributes: {
           "IsPending": {
             DataType: "Number",
             StringValue: "1"
           }
         },
         MessageBody: results.QueryExecutionId,
         QueueUrl: "https://sqs.ap-southeast-2.amazonaws.com/824763547294/data-sharer-MySqsQueue-xYpnN9juJAbo"
       };
       sqs.sendMessage(params, function(err, data) {
         if (err) {
           console.log("Error", err);
           reject(err)
         } else {
           console.log("Success with ExecutionId", results.QueryExecutionId);
           resolve(data)
         }
       });
      })
    })
  }
}

module.exports = { handler };