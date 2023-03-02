



/**
 * Automated login to LinkedIn
 * @param {string} username User email
 * @param {string} password User password
 */
const linkedinLogin = async (username, password, page) => {
    await page.type("#session_key", username);
    await page.type("#session_password", password);
    await page.click(".sign-in-form__submit-button");
  
    // Wait for page load
    return new Promise((resolve) => {
      page.on("framenavigated", async () => {
        if (page.url().startsWith("https://www.linkedin.com/feed")) {
          return resolve();
        }
      });
    });
  };

  /**
 * Scrape LinkedIn to find name of given profile and send them the connection request
 * @param {{email: string, password: string}} data An object with login credentials
 */
const scrapeLinkedIn = async (data) => {
    //Launch a chromium automated session
    const browser = await puppeteer.launch({
      headless: false,
      dumpio: true,
      args: ["--no-sandbox"],
    });
  
    const waitUntilOptions = ["domcontentloaded", "networkidle2"];
  
    try {
      //Open a new tab
      const page = await browser.newPage();
  
      //Page configurations
      await page.setViewport({ width: 1200, height: 1200 });
      page.setDefaultNavigationTimeout(0);
      //Visit LinkedIn
      await page.goto(`https://www.linkedin.com/`);
      //Login to your account
      await linkedinLogin(data.username, data.password, page);
      try {
        //Visit the company's page and find the list of employees
        await page.goto(`https://www.linkedin.com/company/${data.company}`, {
          waitUntil: waitUntilOptions,
        });
  
        //Visit all employees from the company's page
        await page.click(
          "a.ember-view.org-top-card-secondary-content__see-all-link"
        );
      } catch (e) {
        console.error(
          "Oops! An error occured while trying to find the company's page." +
            "\n" +
            "The reason for this error can be either the browser was closed while execution or you entered invalid data in env file." +
            "\n" +
            "Please check the LinkedIn handle of the company you're trying to find and your credentials and try again."
        );
        await browser.close();
      }
  
      await page.waitForNavigation();
  
      //Fetch all profile links
      const profileLinks = await fetchProfileLinks(page);
  
      //Visit activity page and filter the list of active employees
      const activeEmployeesObservable = await fetchEachProfileActivityInParallel(
        page,
        profileLinks,
        waitUntilOptions
      );
      const activeEmployees = await rxjs.lastValueFrom(activeEmployeesObservable);
      console.log("Active users : ", activeEmployees);
  
      //Save profiles to a file
      saveProfiles(activeEmployees);
  
      await browser.close();
    } catch (err) {
      console.error("Oops! An error occured.");
      console.error(err);
      await browser.close();
    }
  };