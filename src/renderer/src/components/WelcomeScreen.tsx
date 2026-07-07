import { useMemo } from 'react';
import { runCommand } from '../commands/registry';

const shortcuts = [
  { label: 'Open File', keys: 'Ctrl+O', command: 'file.open' },
  { label: 'Open Folder', keys: 'Ctrl+Shift+P → Open Folder', command: 'workspace.openFolder' },
  { label: 'Quick Open', keys: 'Ctrl+P', command: 'workbench.action.quickOpen' },
];

const quotes = [
  { text: 'Simplicity is the ultimate sophistication.', author: 'Leonardo da Vinci' },
  { text: 'Stay hungry. Stay foolish.', author: 'Steve Jobs' },
  { text: 'Programs must be written for people to read.', author: 'Harold Abelson' },
  { text: 'The secret of getting ahead is getting started.', author: 'Mark Twain' },
  { text: 'Well begun is half done.', author: 'Aristotle' },
  { text: 'The journey of a thousand miles begins with one step.', author: 'Lao Tzu' },
  { text: 'Make it work, make it right, make it fast.', author: 'Kent Beck' },
  { text: 'Talk is cheap. Show me the code.', author: 'Linus Torvalds' },
  { text: 'Premature optimization is the root of all evil.', author: 'Donald Knuth' },
  { text: 'Any sufficiently advanced technology is indistinguishable from magic.', author: 'Arthur C. Clarke' },
  { text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' },
  { text: 'What I cannot create, I do not understand.', author: 'Richard Feynman' },
  { text: 'Everything should be made as simple as possible, but not simpler.', author: 'Albert Einstein' },
  { text: 'If I have seen further, it is by standing on the shoulders of giants.', author: 'Isaac Newton' },
  { text: 'It always seems impossible until it is done.', author: 'Nelson Mandela' },
  { text: 'The best way to predict the future is to invent it.', author: 'Alan Kay' },
  { text: 'Knowledge is power.', author: 'Francis Bacon' },
  { text: 'I have not failed. I have just found 10,000 ways that will not work.', author: 'Thomas Edison' },
  { text: 'The details are not the details. They make the design.', author: 'Charles Eames' },
  { text: 'Design is not just what it looks like and feels like. Design is how it works.', author: 'Steve Jobs' },
  { text: 'Code is like humor. When you have to explain it, it is bad.', author: 'Cory House' },
  { text: 'First, solve the problem. Then, write the code.', author: 'John Johnson' },
  { text: 'Experience is the name everyone gives to their mistakes.', author: 'Oscar Wilde' },
  { text: 'In theory, theory and practice are the same. In practice, they are not.', author: 'Yogi Berra' },
  { text: 'The most effective debugging tool is still careful thought.', author: 'Brian Kernighan' },
  { text: 'Controlling complexity is the essence of computer programming.', author: 'Brian Kernighan' },
  { text: 'Deleted code is debugged code.', author: 'Jeff Sickel' },
  { text: 'Walking on water and developing software from a specification are easy if both are frozen.', author: 'Edward V. Berard' },
  { text: 'The function of good software is to make the complex appear simple.', author: 'Grady Booch' },
  { text: 'There are two ways of constructing a software design: make it simple, or make it so complicated there are no obvious deficiencies.', author: 'C. A. R. Hoare' },
  { text: 'Perfection is achieved when there is nothing left to take away.', author: 'Antoine de Saint-Exupéry' },
  { text: 'The art challenges the technology, and the technology inspires the art.', author: 'John Lasseter' },
  { text: 'The quieter you become, the more you are able to hear.', author: 'Rumi' },
  { text: 'Do not wait to strike till the iron is hot; make it hot by striking.', author: 'William Butler Yeats' },
  { text: 'Luck is what happens when preparation meets opportunity.', author: 'Seneca' },
  { text: 'A good plan violently executed now is better than a perfect plan next week.', author: 'George S. Patton' },
  { text: 'If you want to go fast, go alone. If you want to go far, go together.', author: 'African proverb' },
  { text: 'The obstacle is the way.', author: 'Marcus Aurelius' },
];

export function WelcomeScreen() {
  const quote = useMemo(() => quotes[Math.floor(Math.random() * quotes.length)]!, []);

  return (
    <div className="welcome-screen">
      <div className="welcome-card">
        <h1>Carlo</h1>
        <figure className="welcome-quote">
          <blockquote>{quote.text}</blockquote>
          <figcaption>— {quote.author}</figcaption>
        </figure>
        <div className="welcome-actions">
          {shortcuts.map((shortcut) => (
            <button key={shortcut.command} onClick={() => void runCommand(shortcut.command)}>
              <span>{shortcut.label}</span>
              <kbd>{shortcut.keys}</kbd>
            </button>
          ))}
        </div>
        <p className="welcome-hint">
          Press <kbd>Ctrl+Shift+P</kbd> for all commands.
        </p>
      </div>
    </div>
  );
}
