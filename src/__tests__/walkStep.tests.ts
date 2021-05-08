import {walkStep} from "../index";

describe('walkStep', () => {

    it("yields all nodes", () => {
        const data = {
            person: {
                name: 'Bob'
            }
        }

        let count = 0;
        for (let walkNode of walkStep(data, {}))
            count++;

        expect(count).toEqual(3);
    });
})

