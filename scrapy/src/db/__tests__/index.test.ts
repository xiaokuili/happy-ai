import { saveDetail } from '../index';

describe('saveDetail', () => {
  it('should save complete detail data successfully', async () => {
    const testData = {
      title: "测试标题1",
      content: "测试内容1", 
      url: "https://test.com/1",
  
    };

    await expect(saveDetail(testData)).resolves.not.toThrow();
  });

});