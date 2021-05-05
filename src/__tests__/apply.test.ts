import {apply} from "../index";
import {WalkNode} from "../node";

describe('apply', () => {

    it("runs once per node", () => {
        const data = {
            person: {
                name: 'Bob'
            }
        }
        let count = 0;
        apply(data, () => count++)
        expect(count).toEqual(3);
    });

    it("runs accepts multiple callbacks", () => {
        const data = {
            person: {
                name: 'Bob'
            }
        }
        let count = 0;
        apply(data, () => count++, () => count++)
        expect(count).toEqual(6);
    });
})

