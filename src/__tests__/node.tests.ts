import {WalkNode, walkStep} from "../index";

describe('WalkNode', () => {

    it("properly formats name", () => {

        const data = {'a': [{'b': {'c': 1}}]}
        const c = WalkNode.fromObjectKey(
            WalkNode.fromObjectKey(
                WalkNode.fromArrayIndex(
                    WalkNode.fromObjectKey(
                        WalkNode.fromRoot(data)
                        , 'a')
                    , 0)
                , 'b')
            , 'c')

        const path = c.getPath()

        expect(path).toEqual('["a"][0]["b"]["c"]');
    });

    it("properly formats name with custom formatter", () => {

        const data = {'a': [{'b': {'c': 1}}]}
        const c = WalkNode.fromObjectKey(
            WalkNode.fromObjectKey(
                WalkNode.fromArrayIndex(
                    WalkNode.fromObjectKey(
                        WalkNode.fromRoot(data)
                        , 'a')
                    , 0)
                , 'b')
            , 'c')

        const path = c.getPath(n => n.isArrayMember ? "?" : "!")

        expect(path).toEqual('!?!!');
    });
})

