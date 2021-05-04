import {WalkNode} from "../types";
import {apply} from "../index";

test("it runs once per node", () => {
    const data = {
        person: {
            name: 'Bob'
        }
    }
    let count = 0;
    apply(data, (node: WalkNode) => {
        count++;
    })

    expect(count).toEqual(3);
});
