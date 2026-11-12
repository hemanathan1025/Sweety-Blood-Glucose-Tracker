import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ReadingFormModal from './ReadingFormModal.jsx';
import { today } from '../date.js';

afterEach(() => {
  cleanup();
});

function renderReadingForm() {
  const user = userEvent.setup();
  const onSave = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();

  render(
    <ReadingFormModal
      open
      reading={null}
      initialDate={today()}
      initialSlot="Morning"
      onClose={onClose}
      onSave={onSave}
    />,
  );

  return { user, onSave };
}

describe('ReadingFormModal', () => {
  it('accepts a valid glucose value', async () => {
    const { user, onSave } = renderReadingForm();
    const glucoseInput = screen.getByLabelText(/glucose value/i);

    await user.type(glucoseInput, '120');
    await user.click(
      screen.getByRole('button', { name: 'Save reading' }),
    );

    await waitFor(() => {
      expect(onSave).toHaveBeenCalled();
    });
    expect(
      screen.queryByText('Value must be between 40 and 600 mg/dl.'),
    ).toBeNull();
  });

  it('shows the required message when the glucose value is empty', async () => {
    const { user, onSave } = renderReadingForm();

    await user.click(
      screen.getByRole('button', { name: 'Save reading' }),
    );

    expect(
      await screen.findByText('Please enter a glucose value.'),
    ).not.toBeNull();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('rejects a value below 40', async () => {
    const { user, onSave } = renderReadingForm();

    await user.type(
      screen.getByLabelText(/glucose value/i),
      '39',
    );
    await user.click(
      screen.getByRole('button', { name: 'Save reading' }),
    );

    expect(
      await screen.findByText(
        'Value must be between 40 and 600 mg/dl.',
      ),
    ).not.toBeNull();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('rejects a value above 600', async () => {
    const { user, onSave } = renderReadingForm();

    await user.type(
      screen.getByLabelText(/glucose value/i),
      '601',
    );
    await user.click(
      screen.getByRole('button', { name: 'Save reading' }),
    );

    expect(
      await screen.findByText(
        'Value must be between 40 and 600 mg/dl.',
      ),
    ).not.toBeNull();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('rejects decimal values because readings must be whole numbers', async () => {
    const { user, onSave } = renderReadingForm();

    await user.type(
      screen.getByLabelText(/glucose value/i),
      '120.5',
    );
    await user.click(
      screen.getByRole('button', { name: 'Save reading' }),
    );

    expect(
      await screen.findByText(
        'Value must be between 40 and 600 mg/dl.',
      ),
    ).not.toBeNull();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('submits the selected reading values to the existing save handler', async () => {
    const { user, onSave } = renderReadingForm();
    const readingDate = today();

    await user.selectOptions(
      screen.getByLabelText('Time slot'),
      'After lunch',
    );
    await user.type(
      screen.getByLabelText(/glucose value/i),
      '147',
    );
    await user.click(
      screen.getByRole('button', { name: 'Save reading' }),
    );

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        reading_date: readingDate,
        time_slot: 'After lunch',
        glucose_value: 147,
      });
    });
  });
});
