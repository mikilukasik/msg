import puppeteer from 'puppeteer';
import { clientHoster } from './clientHoster';

export const getClient = () => {
  let hoster;
  let browser;
  let page;

  return {
    start: async() => {
      hoster = clientHoster();
      await hoster.start();
      browser = await puppeteer.launch();
      page = await browser.newPage();
    },

    stop: async() => {
      await browser.close();
      await hoster.stop();
    },

    getRunner: async({ logger = console } = {}) => {
      if (logger) page.on('console', ({ _type, _text }) => (logger[_type] || logger)('client: ', _text))
      await page.goto('http://0.0.0.0:5678');
      const executionContext = await page.mainFrame().executionContext();
      return executionContext.evaluate.bind(executionContext);
    },
  };
};
