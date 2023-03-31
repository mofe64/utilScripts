const { Builder, By,   } = require('selenium-webdriver');
const fs = require('fs');
const details = []
const pageArticleLinks = []
const parseArticle = async(driver, link)=> {
    await driver.get(link);
    const articleTitle = await driver.getTitle();
    console.log("currently visting article page ", articleTitle)
    const meta = await driver.findElement(By.className('Blog-meta-item--date'));
    const date = await meta.getAttribute('datetime')
    console.log("date is ", date)
    const articleDetails = {}
    const contentArray = await driver.findElements(By.className('sqs-block-content'));
    // console.log("debug ....", contentArray)
    const headerInfoElement = contentArray[0]
    console.log("debug ...", headerInfoElement)
    const headerTextRaw = await headerInfoElement.getText();
    console.log("debug ....", headerTextRaw)
    const headerTextValues = headerTextRaw.split("\n")
    console.log("debug ....", headerTextValues)
    articleDetails['restaurantName'] = headerTextValues[0]
    articleDetails['restaurantAddress'] = (headerTextValues[1]) ? headerTextValues[1].split("|")[0] : "---"
    articleDetails['restaurantPhoneNumber'] = (headerTextValues[1]) ? headerTextValues[1].split("|")[2] : "---"

    let pointer = 0;
    let totalReviewText = '';
    const visitBreakdown = {
        itemsBought :[],
        totalSpend : 0
    }
    for await (const val of contentArray){
        if(pointer !== 0){
            const reviewText = await val.getText();
            if(reviewText.length > 100) {
                totalReviewText += " ";
                if(!reviewText.startsWith("DAMAGE")) {
                    totalReviewText += reviewText;
                }else {
                    const damageArray = reviewText.split("\n");
                    damageArray.shift();
                    damageArray.forEach((item)=> {
                        if(item.includes(" — ")){
                            const itemArray = item.split(" — ")
                            const itemName = itemArray[0]
                            const itemPrice = itemArray[1].split("N")[1]
                            if(!isNaN(itemPrice)){
                                const priceIntValue = Number(itemPrice);
                                visitBreakdown.totalSpend += priceIntValue;
                            }
                            
                            const itemBought = {
                                itemName,
                                itemPrice
                            }
                            visitBreakdown.itemsBought.push(itemBought);
                        }
                       
                    })
                }
                
            }                  
        }
        pointer += 1
    }
    const finalTotalReviewText = totalReviewText.replace(/\n/g, " ");
    articleDetails['review'] = finalTotalReviewText;
    articleDetails['spendDetails'] = visitBreakdown;
    articleDetails['link'] = link;
    details.push(articleDetails);
    await driver.close();
}
const start = async (url) => {
    const driver = await new Builder().forBrowser('MicrosoftEdge').build();
    try {
        await driver.get(url);
        const articleXpath = '//*[contains(@id, "post-")]';
        const articleLinkXpath = '//*[contains(@id, "post-")]/a'

        const articlesOnCurrentPage = await driver.findElements(By.xpath(articleXpath));
        const lastArticleInPage = articlesOnCurrentPage[articlesOnCurrentPage.length -1];
        const lastArticleDateElement = await lastArticleInPage.findElement(By.className('Blog-meta-item--date'));
        const date = await lastArticleDateElement.getAttribute('datetime')
        const year = date.split("-")[0]
        const hasReachedLimit = Number(year) >= 2019
        if(hasReachedLimit){
            const articlesLinks = await driver.findElements(By.xpath(articleLinkXpath));
            for await (const link of articlesLinks) {
                const articleLink = await link.getAttribute('href')
                pageArticleLinks.push(articleLink)
            }
            const nextXPath = '//*[contains(@class, "BlogList-pagination")]/a'
            const paginationTags = await driver.findElements(By.xpath(nextXPath));
            let linkToNextPage = "";
            for await (const val of paginationTags) {
                const link = await val.getAttribute('href');
                if(!link.includes("&reversePaginate=true")) {
                    linkToNextPage = link;
                    break;
                }
            }
           
            console.log(linkToNextPage);
            console.log("article length for this page is ", articlesLinks.length)
            console.log("article links for this page is ", pageArticleLinks)
            if(linkToNextPage.length === 0){
                return;
            }
            start(linkToNextPage)
        }else {
            return;
        }

        // for await (const link of pageArticleLinks){
        //     const driver = await new Builder().forBrowser('MicrosoftEdge').build();
        //     await parseArticle(driver,link)
        // }
        // console.log("for first page ", details)
        await driver.sleep(3000);
    } finally {
        await driver.quit();
    }
}

const internal = async() =>{
    const driver = await new Builder().forBrowser('MicrosoftEdge').build();
    try{
        for await (const link of pageArticleLinks){
            const driver = await new Builder().forBrowser('MicrosoftEdge').build();
            await parseArticle(driver,link)
        }
    } finally {
        await driver.quit();
    }
}

start('https://www.eatdrinklagos.com/review').then(()=> {
   internal().then(()=>{
    const json = JSON.stringify(details);
    fs.writeFile('reviews.json', json, err => {
        if(err){
            console.log("error writing file ...")
        } else {

            console.log(" write complete ...", details.length)
        }
    })
   })
})


