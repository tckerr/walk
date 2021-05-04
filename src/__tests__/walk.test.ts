import walk from "../index";
import {Config, WalkNode} from "../types";
import {defaultConfig} from "../defaults";

test("it finds objects by class name", () => {
    const data = {
        person: {
            name: 'Bob'
        }
    }
    const names: string[] = []
    const config: Config = {
        ...defaultConfig,
        callbacks: [
            {
                keyFilters: ['person'],
                callback: (node: WalkNode) => names.push(node.val.name)
            }
        ]
    }


    walk(data, config)

    expect(names).toEqual(['Bob']);
});
