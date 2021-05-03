import walk from "../index";

test("it finds objects by class name", () => {
    const data = {
        person: {
            name: 'Bob'
        }
    }
    const names: string[] = []
    const config = {
        classMap: {
            "person": "person",
        },
        callbacks: [
            {
                classNames: ['person'],
                callback: function (node: any) {
                    names.push(node.val.name)
                }
            }
        ]
    }


    walk(data, undefined, config)

    expect(names).toEqual(['Bob']);
});
