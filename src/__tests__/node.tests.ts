import {WalkNode} from "../index";

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

    it("sets children", () => {
        const data = {'a': [{'b': {'c': 1}}]}
        const root = WalkNode.fromRoot(data);

        const children = root.children;

        expect(children.length).toEqual(1);
        expect(children[0].key).toEqual('a');
    });

    it("sets children to empty for value", () => {
        const data = {'a': 1}
        const a = WalkNode.fromObjectKey(WalkNode.fromRoot(data), 'a');

        expect(a.children.length).toEqual(0);
    });

    it("sets siblings for array indexes", () => {
        const data = ['a', 'b', 'c']
        const b = WalkNode.fromArrayIndex(WalkNode.fromRoot(data), 1);

        const siblings = b.siblings;

        expect(siblings.length).toEqual(2);
        expect(siblings[0].key).toEqual(0);
        expect(siblings[1].key).toEqual(2);
    });

    it("sets siblings for object keys", () => {
        const data = {'a':1, 'b':2, 'c':3}

        const b = WalkNode.fromObjectKey(WalkNode.fromRoot(data), 'b');

        const siblings = b.siblings;

        expect(siblings.length).toEqual(2);
        expect(siblings[0].key).toEqual('a');
        expect(siblings[1].key).toEqual('c');
    });

    it("sets siblings to empty when solo", () => {
        const data = {'b':2}

        const b = WalkNode.fromObjectKey(WalkNode.fromRoot(data), 'b');

        expect(b.siblings.length).toEqual(0);
    });

    it("sets siblings to empty for root", () => {
        const data = {'a':1, 'b':2, 'c':3}

        const root = WalkNode.fromRoot(data);

        const siblings = root.siblings;

        expect(siblings.length).toEqual(0);
    });

    it("sets descendants", () => {
        const data = {'a': [{'b': {'c': 1}}], 'd': 1}
        const root = WalkNode.fromRoot(data);

        const descendants = root.descendants;

        expect(descendants.length).toEqual(5);
        expect(descendants[0].key).toEqual('a');
        expect(descendants[1].key).toEqual(0);
        expect(descendants[2].key).toEqual('b');
        expect(descendants[3].key).toEqual('c');
        expect(descendants[4].key).toEqual('d');
    });

    it("sets descendants to empty for value", () => {
        const data = {'a': 1}
        const a = WalkNode.fromObjectKey(WalkNode.fromRoot(data), 'a');

        expect(a.descendants.length).toEqual(0);
    });

    it("sets ancestors", () => {

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

        const ancestors = c.ancestors;

        expect(ancestors.length).toEqual(4);
        expect(ancestors[0].key).toEqual('b');
        expect(ancestors[1].key).toEqual(0);
        expect(ancestors[2].key).toEqual('a');
        expect(ancestors[3].key).toBeUndefined();
    });

    it("sets ancestors to empty for root", () => {
        const data = {'a':1, 'b':2, 'c':3}

        const root = WalkNode.fromRoot(data);

        expect(root.ancestors.length).toEqual(0);
    });
})

