import {WalkBuilder} from "../index";

describe("WalkBuilder", () => {
    it("works", () => {
        let count = 0;
        new WalkBuilder()
            .withSimpleCallback(() => ++count)
            .walk({})
        expect(count).toEqual(1);
    });
})
