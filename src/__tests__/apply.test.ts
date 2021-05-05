import {apply} from "../index";
import {WalkNode} from "../node";

test("it runs once per node", () => {
    const data = {
        person: {
            name: 'Bob'
        }
    }
    let count = 0;
    apply(data, () => count++)
    expect(count).toEqual(3);
});
