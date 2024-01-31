
import Quill from 'quill';
const BlockEmbed = Quill.import('blots/block/embed');

export class TableBlockEmbed extends BlockEmbed {

    static blotName = 'TableBlockEmbed';
    static tagName = 'table';

    static create(value) {
        const node = super.create();
        let valueToReturn = value;
        if (!value.includes('assignedTableId')) {
            const tableId = `assignedTableId-${Date.now()}`;
            valueToReturn = value
                .replace('#tableId', `#${tableId}`)
                .replace('table-layout: fixed;', '');
            node.setAttribute('id', tableId);
        } else {
            const existedId = valueToReturn.match(/#assignedTableId-(\d+)/i)[1];
            node.setAttribute('id', `assignedTableId-${existedId}`);
        }
        node.innerHTML = this.transformValue(valueToReturn);
        return node;
    }

    static transformValue(value) {
        let handleArr = value.split('\n');
        handleArr = handleArr.map(e => e.replace(/^[\s]+/, '')
            .replace(/[\s]+$/, ''));
        return handleArr.join('');
    }

    static value(node) {
        return node.innerHTML;
    }
}

export function onEditorCreated(quill: Quill): void {
    quill.clipboard.addMatcher('TABLE', (node, delta) => {
      const Delta = Quill.import('delta');
      const tableTagStyles = node.getAttribute('style');
      return new Delta([
        {
          insert: {
            TableBlockEmbed:
              // `<style>#tableId {${tableTagStyles} margin: 0 auto !important; }</style>` + delta.ops[0].insert.TableBlockEmbed
              `<style>#tableId {${tableTagStyles} margin: 0 auto !important; }</style>`

          }
        }
      ]);
    });
  }