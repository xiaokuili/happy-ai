import { MafengwoListSpider, MafengwoDetailSpider } from "./spider";


const args = process.argv.slice(2);
// const type = args[0] || 'list'; // Default to list if no argument provided
const type = args[0] || 'detail'; // Default to list if no argument provided

(async () => {
  if (type === 'list') {
    await MafengwoListSpider();
  } else if (type === 'detail') {
    await MafengwoDetailSpider(); 
  } else {
    console.log('Invalid type. Please use "list" or "detail"');
  }
})();
