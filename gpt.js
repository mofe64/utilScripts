const { Configuration, OpenAIApi } = require("openai");
const { performance} = require('perf_hooks')
const reviews = require('./reviews.json')
const dotenv = require('dotenv');
dotenv.config({ path: './config.env' });
const fs = require('fs');
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});


const factory = function(){
  var time = 0, count = 0, difference = 0, queue = [];
  return function limit(func){
      if(func) queue.push(func);
      difference = 60000 - (performance.now()- time);
      if(difference <= 0) {
          time = performance.now();
          count = 0;
      }
      if(++count <= 20) {
        const x = queue.shift()
        console.log(" shift res --> ", x)
      }
      else setTimeout(limit, difference);
  };
};
const limited = factory()


console.log(configuration.apiKey);
const openai = new OpenAIApi(configuration);
const results = []
let pointer = 0;
const start = async()=> {
  for await (const review of reviews){
    const reviewSummarized = {
     ...review
    }
    console.log(`Making chat complete call for ${review.restaurantName}`)
    const chatCompletaion = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [
        {'role': 'system', 'content': 'You are a helpful assistant.'},
        {"role": "user", "content": `Don't make any reference to the original review in the provided link ,
        do not also mention any research you might have done or the fact that you have done any research
        Do not make any reference to any previously reviewed places.
        using this link ${review.link} advise me whether I should visit the reviewed restaurant, 
        here is a sample of how your response should be
        Hov lounge has a cosy and intimate ambience with an outdoor seating area that offers a relaxing view of the water, However, the food and drinks were disappointing, particularly the seafood which was overcooked, and the cocktails were poorly made. The service was also slow. Despite these shortcomings, the environment is quite good" 
        `},
      ],
      temperature: 0.6
    })
    const response = chatCompletaion.data.choices[0].message;
    console.log(`Making chat complete call for ${review.restaurantName}`)
    reviewSummarized['review'] = response.content;
    results.push(reviewSummarized)
    console.log(`chat complete call for ${review.restaurantName} completed with reason ${chatCompletaion.data.choices[0].finish_reason}`)
  }
 
  console.log("---------------------------------------------------------------------------");
}

limited(
  start().then(()=> {
  results.forEach(res => {
    let name = `results/${res.restaurantName}.txt`;
    name = name.replace(/\|/g, " ");
    const filePathText = name;
    delete res.spendDetails;
    const jsonData = JSON.stringify(res);
    let strippedText = jsonData.substring(1, jsonData.length - 1);
    let finalText = strippedText.replace(/,(?=(?:(?:[^"]*"){2})*[^"]*$)(?![^\[]*\])/g,'\n');
    fs.writeFile(filePathText, finalText, (err) => {
      if (err) {
        console.error(err);
        return;
      }
      console.log('Data written to file');
    });
  })
}).then(()=> {
  const json = JSON.stringify(results);
    fs.writeFile('results/reviews-summarized.json', json, err => {
        if(err){
            console.log("error writing file ...")
        } else {
            console.log(" write complete ...")
        }
    })
})
)



